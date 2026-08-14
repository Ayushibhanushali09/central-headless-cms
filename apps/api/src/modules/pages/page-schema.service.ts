import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import type {
  SchemaValidationResult,
  ValidationIssue,
} from '../schema-engine/schema-engine.types';
import { PageSchemaRequestDto } from './dto/page-schema-request.dto';
import { PageSchemaResponseDto } from './dto/page-schema-response.dto';
import { PagesService } from './pages.service';
import {
  PageDraft,
  type PageDraftDocument,
} from './schemas/page-draft.schema';
import {
  PagePublication,
  type PagePublicationDocument,
} from './schemas/page-publication.schema';
import {
  PageSchemaRecord,
  type PageSchemaRecordDocument,
} from './schemas/page-schema-record.schema';

@Injectable()
export class PageSchemaService {
  constructor(
    @InjectModel(PageSchemaRecord.name)
    private readonly pageSchemaModel: Model<PageSchemaRecordDocument>,

    @InjectModel(PageDraft.name)
    private readonly pageDraftModel: Model<PageDraftDocument>,

    @InjectModel(PagePublication.name)
    private readonly pagePublicationModel: Model<PagePublicationDocument>,

    private readonly pagesService: PagesService,

    private readonly schemaEngineService: SchemaEngineService,
  ) {}

  async validateForPage(
    pagePublicId: string,
    requestDto: PageSchemaRequestDto,
  ): Promise<SchemaValidationResult> {
    await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    return this.schemaEngineService.validateSchema(
      requestDto.schemaDefinition,
    );
  }

  async getSchema(
    pagePublicId: string,
  ): Promise<PageSchemaResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const pageSchema = await this.findPageSchema(
      page._id,
    );

    return this.toResponse(
      pagePublicId,
      pageSchema,
    );
  }

  async saveSchema(
    pagePublicId: string,
    requestDto: PageSchemaRequestDto,
  ): Promise<PageSchemaResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const schemaValidation =
      this.schemaEngineService.validateSchema(
        requestDto.schemaDefinition,
      );

    if (
      !schemaValidation.valid ||
      !schemaValidation.schemaHash
    ) {
      throw new BadRequestException({
        code: 'INVALID_SCHEMA',
        message: 'The supplied JSON Schema is invalid.',
        details: schemaValidation.errors,
      });
    }

    const [
      currentSchema,
      currentDraft,
      currentPublication,
    ] = await Promise.all([
      this.findPageSchema(page._id),
      this.findPageDraft(page._id),
      this.findPagePublication(page._id),
    ]);

    if (
      currentDraft.schemaVersion !==
      currentSchema.schemaVersion
    ) {
      throw new ConflictException({
        code: 'DRAFT_SCHEMA_OUT_OF_SYNC',
        message:
          'The Draft is not synchronized with the current Schema.',
        details: {
          schemaVersion: currentSchema.schemaVersion,
          draftSchemaVersion:
            currentDraft.schemaVersion,
        },
      });
    }

    if (
      currentSchema.schemaDefinition !== null &&
      currentSchema.schemaHash ===
        schemaValidation.schemaHash
    ) {
      return this.toResponse(
        pagePublicId,
        currentSchema,
      );
    }

    this.assertContentCompatibility(
      requestDto.schemaDefinition,
      currentDraft,
      currentPublication,
    );

    const previousSchemaDefinition =
      currentSchema.schemaDefinition;

    const previousSchemaHash =
      currentSchema.schemaHash;

    const previousSchemaVersion =
      currentSchema.schemaVersion;

    const updatedSchema = await this.pageSchemaModel
      .findOneAndUpdate(
        {
          _id: currentSchema._id,
          schemaVersion: previousSchemaVersion,
        },
        {
          $set: {
            schemaDefinition:
              requestDto.schemaDefinition,
            schemaHash:
              schemaValidation.schemaHash,
            updatedBy: null,
          },
          $inc: {
            schemaVersion: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedSchema) {
      throw new ConflictException({
        code: 'SCHEMA_UPDATE_CONFLICT',
        message:
          'The Schema was modified by another request. Reload and try again.',
      });
    }

    const draftUpdateResult =
      await this.pageDraftModel
        .updateOne(
          {
            _id: currentDraft._id,
            schemaVersion: previousSchemaVersion,
          },
          {
            $set: {
              schemaVersion:
                updatedSchema.schemaVersion,
            },
          },
          {
            runValidators: true,
          },
        )
        .exec();

    if (draftUpdateResult.modifiedCount !== 1) {
      await this.rollbackSchemaUpdate(
        updatedSchema,
        previousSchemaDefinition,
        previousSchemaHash,
        previousSchemaVersion,
      );

      throw new ConflictException({
        code: 'DRAFT_SCHEMA_SYNC_CONFLICT',
        message:
          'The Draft changed while updating the Schema. The Schema update was rolled back.',
      });
    }

    return this.toResponse(
      pagePublicId,
      updatedSchema,
    );
  }

  private assertContentCompatibility(
    schemaDefinition: Record<string, unknown>,
    pageDraft: PageDraftDocument,
    publication: PagePublicationDocument | null,
  ): void {
    const incompatibleContent: Record<
      string,
      ValidationIssue[]
    > = {};

    if (pageDraft.draftData !== null) {
      const draftValidation =
        this.schemaEngineService.validateContent(
          schemaDefinition,
          pageDraft.draftData,
        );

      if (!draftValidation.valid) {
        incompatibleContent.draft =
          draftValidation.errors;
      }
    }

    if (publication !== null) {
      const publishedValidation =
        this.schemaEngineService.validateContent(
          schemaDefinition,
          publication.publishedData,
        );

      if (!publishedValidation.valid) {
        incompatibleContent.published =
          publishedValidation.errors;
      }
    }

    if (Object.keys(incompatibleContent).length > 0) {
      throw new ConflictException({
        code: 'SCHEMA_BREAKS_EXISTING_CONTENT',
        message:
          'The new Schema is incompatible with existing content.',
        details: incompatibleContent,
      });
    }
  }

  private async findPageSchema(
    pageId: Types.ObjectId,
  ): Promise<PageSchemaRecordDocument> {
    const pageSchema = await this.pageSchemaModel
      .findOne({
        pageId,
      })
      .exec();

    if (!pageSchema) {
      throw new InternalServerErrorException({
        code: 'PAGE_SCHEMA_MISSING',
        message:
          'The Page Schema record is missing for this Page.',
      });
    }

    return pageSchema;
  }

  private async findPageDraft(
    pageId: Types.ObjectId,
  ): Promise<PageDraftDocument> {
    const pageDraft = await this.pageDraftModel
      .findOne({
        pageId,
      })
      .exec();

    if (!pageDraft) {
      throw new InternalServerErrorException({
        code: 'PAGE_DRAFT_MISSING',
        message:
          'The Page Draft record is missing for this Page.',
      });
    }

    return pageDraft;
  }

  private async findPagePublication(
    pageId: Types.ObjectId,
  ): Promise<PagePublicationDocument | null> {
    return this.pagePublicationModel
      .findOne({
        pageId,
      })
      .exec();
  }

  private async rollbackSchemaUpdate(
    updatedSchema: PageSchemaRecordDocument,
    previousSchemaDefinition:
      | Record<string, unknown>
      | null,
    previousSchemaHash: string,
    previousSchemaVersion: number,
  ): Promise<void> {
    const rollbackResult =
      await this.pageSchemaModel
        .updateOne(
          {
            _id: updatedSchema._id,
            schemaVersion:
              updatedSchema.schemaVersion,
          },
          {
            $set: {
              schemaDefinition:
                previousSchemaDefinition,
              schemaHash: previousSchemaHash,
              schemaVersion:
                previousSchemaVersion,
              updatedBy: null,
            },
          },
          {
            runValidators: true,
          },
        )
        .exec();

    if (rollbackResult.modifiedCount !== 1) {
      throw new InternalServerErrorException({
        code: 'SCHEMA_ROLLBACK_FAILED',
        message:
          'The Schema update could not be rolled back safely.',
      });
    }
  }

  private toResponse(
    pagePublicId: string,
    pageSchema: PageSchemaRecordDocument,
  ): PageSchemaResponseDto {
    return {
      pageId: pagePublicId,
      schemaDefinition:
        pageSchema.schemaDefinition,
      schemaVersion:
        pageSchema.schemaVersion,
      schemaHash:
        pageSchema.schemaHash || null,
      updatedAt: pageSchema.updatedAt,
    };
  }
}