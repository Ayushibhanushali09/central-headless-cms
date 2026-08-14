import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import { PageContentResponseDto } from './dto/page-content-response.dto';
import { PublishContentDto } from './dto/publish-content.dto';
import { SaveDraftContentDto } from './dto/save-draft-content.dto';
import { PagesService } from './pages.service';
import {
  PageDraft,
  type PageDraftDocument,
} from './schemas/page-draft.schema';
import {
  PagePublication,
  type PagePublicationDocument,
  PublicationStatus,
} from './schemas/page-publication.schema';
import {
  PageSchemaRecord,
  type PageSchemaRecordDocument,
} from './schemas/page-schema-record.schema';

@Injectable()
export class PageContentService {
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

  async getContent(
    pagePublicId: string,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const [pageSchema, pageDraft, publication] =
      await Promise.all([
        this.findPageSchema(page._id),
        this.findPageDraft(page._id),
        this.findPagePublication(page._id),
      ]);

    return this.toResponse(
      pagePublicId,
      pageSchema,
      pageDraft,
      publication,
    );
  }

  async saveDraft(
    pagePublicId: string,
    requestDto: SaveDraftContentDto,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const [pageSchema, pageDraft, publication] =
      await Promise.all([
        this.findPageSchema(page._id),
        this.findPageDraft(page._id),
        this.findPagePublication(page._id),
      ]);

    this.assertSchemaConfigured(pageSchema);

    if (
      pageDraft.schemaVersion !==
      pageSchema.schemaVersion
    ) {
      throw new ConflictException({
        code: 'DRAFT_SCHEMA_OUT_OF_SYNC',
        message:
          'The Draft is not synchronized with the current Schema. Reload and try again.',
        details: {
          schemaVersion: pageSchema.schemaVersion,
          draftSchemaVersion: pageDraft.schemaVersion,
        },
      });
    }

    const contentValidation =
      this.schemaEngineService.validateContent(
        pageSchema.schemaDefinition,
        requestDto.contentData,
      );

    if (!contentValidation.valid) {
      throw new BadRequestException({
        code: 'INVALID_CONTENT',
        message:
          'The supplied content does not match the current Page Schema.',
        details: contentValidation.errors,
      });
    }

    const draftUpdatedAt = new Date();

    const updatedDraft = await this.pageDraftModel
      .findOneAndUpdate(
        {
          _id: pageDraft._id,
          schemaVersion: pageSchema.schemaVersion,
          draftVersion: pageDraft.draftVersion,
        },
        {
          $set: {
            draftData: requestDto.contentData,
            draftUpdatedAt,
            updatedBy: null,
          },
          $inc: {
            draftVersion: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedDraft) {
      throw new ConflictException({
        code: 'DRAFT_UPDATE_CONFLICT',
        message:
          'The Schema or Draft changed during this request. Reload and try again.',
      });
    }

    return this.toResponse(
      pagePublicId,
      pageSchema,
      updatedDraft,
      publication,
    );
  }

  async publish(
    pagePublicId: string,
    requestDto: PublishContentDto,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const [pageSchema, pageDraft, publication] =
      await Promise.all([
        this.findPageSchema(page._id),
        this.findPageDraft(page._id),
        this.findPagePublication(page._id),
      ]);

    this.assertSchemaConfigured(pageSchema);

    if (
      pageDraft.schemaVersion !==
      pageSchema.schemaVersion
    ) {
      throw new ConflictException({
        code: 'DRAFT_SCHEMA_OUT_OF_SYNC',
        message:
          'The Draft is not synchronized with the current Schema.',
        details: {
          schemaVersion: pageSchema.schemaVersion,
          draftSchemaVersion: pageDraft.schemaVersion,
        },
      });
    }

    if (
      pageDraft.draftData === null ||
      pageDraft.draftVersion < 1
    ) {
      throw new ConflictException({
        code: 'DRAFT_NOT_FOUND',
        message: 'There is no Draft content to publish.',
      });
    }

    if (
      requestDto.expectedDraftVersion !==
      pageDraft.draftVersion
    ) {
      throw new ConflictException({
        code: 'STALE_DRAFT_VERSION',
        message:
          'The Draft changed after it was loaded. Reload and review the latest Draft.',
        details: {
          expectedDraftVersion:
            requestDto.expectedDraftVersion,
          currentDraftVersion: pageDraft.draftVersion,
        },
      });
    }

    const publicationIsCurrent =
      publication !== null &&
      publication.publishedFromDraftVersion ===
        pageDraft.draftVersion &&
      publication.schemaHash === pageSchema.schemaHash &&
      publication.visibility === page.visibility &&
      publication.status === PublicationStatus.Published;

    if (publicationIsCurrent) {
      return this.toResponse(
        pagePublicId,
        pageSchema,
        pageDraft,
        publication,
      );
    }

    const contentValidation =
      this.schemaEngineService.validateContent(
        pageSchema.schemaDefinition,
        pageDraft.draftData,
      );

    if (!contentValidation.valid) {
      throw new ConflictException({
        code: 'DRAFT_NOT_PUBLISHABLE',
        message:
          'The Draft no longer matches the current Page Schema.',
        details: contentValidation.errors,
      });
    }

    const publishedAt = new Date();

    let updatedPublication: PagePublicationDocument;

    if (publication) {
      const updated = await this.pagePublicationModel
        .findOneAndUpdate(
          {
            _id: publication._id,
            publishedVersion:
              publication.publishedVersion,
            publishedFromDraftVersion:
              publication.publishedFromDraftVersion,
            schemaHash: publication.schemaHash,
          },
          {
            $set: {
              pagePublicId: page.publicId,
              projectId: page.projectId,
              visibility: page.visibility,
              status: PublicationStatus.Published,
              publishedData: pageDraft.draftData,
              publishedFromDraftVersion:
                pageDraft.draftVersion,
              schemaHash: pageSchema.schemaHash,
              publishedAt,
              publishedBy: null,
            },
            $inc: {
              publishedVersion: 1,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!updated) {
        throw new ConflictException({
          code: 'PUBLISH_CONFLICT',
          message:
            'The Schema, Draft or Publication changed during this request. Reload and try again.',
        });
      }

      updatedPublication = updated;
    } else {
      try {
        updatedPublication =
          await this.pagePublicationModel.create({
            pageId: page._id,
            pagePublicId: page.publicId,
            projectId: page.projectId,
            visibility: page.visibility,
            status: PublicationStatus.Published,
            publishedData: pageDraft.draftData,
            publishedVersion: 1,
            publishedFromDraftVersion:
              pageDraft.draftVersion,
            schemaHash: pageSchema.schemaHash,
            publishedAt,
            publishedBy: null,
          });
      } catch (error: unknown) {
        if (this.isDuplicateKeyError(error)) {
          throw new ConflictException({
            code: 'PUBLISH_CONFLICT',
            message:
              'A Publication was created by another request. Reload and try again.',
          });
        }

        throw error;
      }
    }

    return this.toResponse(
      pagePublicId,
      pageSchema,
      pageDraft,
      updatedPublication,
    );
  }

  private assertSchemaConfigured(
    pageSchema: PageSchemaRecordDocument,
  ): asserts pageSchema is PageSchemaRecordDocument & {
    schemaDefinition: Record<string, unknown>;
  } {
    if (
      pageSchema.schemaDefinition === null ||
      !pageSchema.schemaHash ||
      pageSchema.schemaVersion < 1
    ) {
      throw new ConflictException({
        code: 'SCHEMA_NOT_CONFIGURED',
        message:
          'A valid Page Schema must be saved before content can be edited or published.',
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

  private toResponse(
    pagePublicId: string,
    pageSchema: PageSchemaRecordDocument,
    pageDraft: PageDraftDocument,
    publication: PagePublicationDocument | null,
  ): PageContentResponseDto {
    const publishedFromDraftVersion =
      publication?.publishedFromDraftVersion ?? 0;

    const latestUpdatedAt = new Date(
      Math.max(
        pageSchema.updatedAt.getTime(),
        pageDraft.updatedAt.getTime(),
        publication?.updatedAt.getTime() ?? 0,
      ),
    );

    const hasDraft =
      pageDraft.draftData !== null &&
      pageDraft.draftVersion > 0;

    const hasUnpublishedChanges =
      hasDraft &&
      (
        publication === null ||
        pageDraft.draftVersion >
          publishedFromDraftVersion ||
       publication.schemaHash !== pageSchema.schemaHash
      );
    return {
      pageId: pagePublicId,
      schemaVersion: pageSchema.schemaVersion,
      schemaHash: pageSchema.schemaHash,
      draftData: pageDraft.draftData,
      draftVersion: pageDraft.draftVersion,
      draftUpdatedAt: pageDraft.draftUpdatedAt,
      publishedData:
        publication?.publishedData ?? null,
      publishedVersion:
        publication?.publishedVersion ?? 0,
      publishedFromDraftVersion,
      publishedAt: publication?.publishedAt ?? null,
      hasUnpublishedChanges,
      updatedAt: latestUpdatedAt,
    };
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}