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
  PageData,
  type PageDataDocument,
} from './schemas/page-data.schema';

@Injectable()
export class PageSchemaService {
  constructor(
    @InjectModel(PageData.name)
    private readonly pageDataModel: Model<PageDataDocument>,

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

    const pageData = await this.findPageData(page._id);

    return this.toResponse(pagePublicId, pageData);
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

    const pageData = await this.findPageData(page._id);

    if (
      pageData.schemaDefinition !== null &&
      pageData.schemaHash === schemaValidation.schemaHash
    ) {
      return this.toResponse(pagePublicId, pageData);
    }

    this.assertContentCompatibility(
      requestDto.schemaDefinition,
      pageData,
    );

    const updatedPageData = await this.pageDataModel
      .findOneAndUpdate(
        {
          _id: pageData._id,
          schemaVersion: pageData.schemaVersion,
        },
        {
          $set: {
            schemaDefinition: requestDto.schemaDefinition,
            schemaHash: schemaValidation.schemaHash,
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

    if (!updatedPageData) {
      throw new ConflictException({
        code: 'SCHEMA_UPDATE_CONFLICT',
        message:
          'The schema was modified by another request. Reload and try again.',
      });
    }

    return this.toResponse(
      pagePublicId,
      updatedPageData,
    );
  }

  private assertContentCompatibility(
    schemaDefinition: Record<string, unknown>,
    pageData: PageDataDocument,
  ): void {
    const incompatibleContent: Record<
      string,
      ValidationIssue[]
    > = {};

    if (pageData.draftData !== null) {
      const draftValidation =
        this.schemaEngineService.validateContent(
          schemaDefinition,
          pageData.draftData,
        );

      if (!draftValidation.valid) {
        incompatibleContent.draft =
          draftValidation.errors;
      }
    }

    if (pageData.publishedData !== null) {
      const publishedValidation =
        this.schemaEngineService.validateContent(
          schemaDefinition,
          pageData.publishedData,
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
          'The new schema is incompatible with existing content.',
        details: incompatibleContent,
      });
    }
  }

  private async findPageData(
    pageId: Types.ObjectId,
  ): Promise<PageDataDocument> {
    const pageData = await this.pageDataModel
      .findOne({ pageId })
      .exec();

    if (!pageData) {
      throw new InternalServerErrorException({
        code: 'PAGE_DATA_MISSING',
        message:
          'The page data record is missing for this page.',
      });
    }

    return pageData;
  }

  private toResponse(
    pagePublicId: string,
    pageData: PageDataDocument,
  ): PageSchemaResponseDto {
    return {
      pageId: pagePublicId,
      schemaDefinition: pageData.schemaDefinition,
      schemaVersion: pageData.schemaVersion,
      schemaHash: pageData.schemaHash || null,
      updatedAt: pageData.updatedAt,
    };
  }
}