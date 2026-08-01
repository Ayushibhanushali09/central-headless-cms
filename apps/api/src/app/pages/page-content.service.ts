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
  PageData,
  type PageDataDocument,
} from './schemas/page-data.schema';

@Injectable()
export class PageContentService {
  constructor(
    @InjectModel(PageData.name)
    private readonly pageDataModel: Model<PageDataDocument>,

    private readonly pagesService: PagesService,

    private readonly schemaEngineService: SchemaEngineService,
  ) {}

  async getContent(
    pagePublicId: string,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const pageData = await this.findPageData(page._id);

    return this.toResponse(pagePublicId, pageData);
  }

  async saveDraft(
    pagePublicId: string,
    requestDto: SaveDraftContentDto,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const pageData = await this.findPageData(page._id);

    this.assertSchemaConfigured(pageData);

    const contentValidation =
      this.schemaEngineService.validateContent(
        pageData.schemaDefinition,
        requestDto.contentData,
      );

    if (!contentValidation.valid) {
      throw new BadRequestException({
        code: 'INVALID_CONTENT',
        message:
          'The supplied content does not match the current page schema.',
        details: contentValidation.errors,
      });
    }

    const draftUpdatedAt = new Date();

    const updatedPageData = await this.pageDataModel
      .findOneAndUpdate(
        {
          _id: pageData._id,
          schemaVersion: pageData.schemaVersion,
          draftVersion: pageData.draftVersion,
        },
        {
          $set: {
            draftData: requestDto.contentData,
            draftUpdatedAt,
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

    if (!updatedPageData) {
      throw new ConflictException({
        code: 'DRAFT_UPDATE_CONFLICT',
        message:
          'The schema or draft changed during this request. Reload and try again.',
      });
    }

    return this.toResponse(
      pagePublicId,
      updatedPageData,
    );
  }

  async publish(
    pagePublicId: string,
    requestDto: PublishContentDto,
  ): Promise<PageContentResponseDto> {
    const page = await this.pagesService.findActiveDocument(
      pagePublicId,
    );

    const pageData = await this.findPageData(page._id);

    this.assertSchemaConfigured(pageData);

    if (
      pageData.draftData === null ||
      pageData.draftVersion < 1
    ) {
      throw new ConflictException({
        code: 'DRAFT_NOT_FOUND',
        message: 'There is no Draft content to publish.',
      });
    }

    if (
      requestDto.expectedDraftVersion !==
      pageData.draftVersion
    ) {
      throw new ConflictException({
        code: 'STALE_DRAFT_VERSION',
        message:
          'The Draft changed after it was loaded. Reload and review the latest Draft.',
        details: {
          expectedDraftVersion:
            requestDto.expectedDraftVersion,
          currentDraftVersion: pageData.draftVersion,
        },
      });
    }

    const publishedFromDraftVersion =
      pageData.publishedFromDraftVersion ?? 0;

    if (
      pageData.publishedData !== null &&
      publishedFromDraftVersion ===
        pageData.draftVersion
    ) {
      return this.toResponse(pagePublicId, pageData);
    }

    const contentValidation =
      this.schemaEngineService.validateContent(
        pageData.schemaDefinition,
        pageData.draftData,
      );

    if (!contentValidation.valid) {
      throw new ConflictException({
        code: 'DRAFT_NOT_PUBLISHABLE',
        message:
          'The Draft no longer matches the current page schema.',
        details: contentValidation.errors,
      });
    }

    const publishedAt = new Date();

    const updatedPageData = await this.pageDataModel
      .findOneAndUpdate(
        {
          _id: pageData._id,
          schemaVersion: pageData.schemaVersion,
          draftVersion: pageData.draftVersion,
          publishedVersion: pageData.publishedVersion,
          publishedFromDraftVersion,
        },
        {
          $set: {
            publishedData: pageData.draftData,
            publishedFromDraftVersion:
              pageData.draftVersion,
            publishedAt,
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

    if (!updatedPageData) {
      throw new ConflictException({
        code: 'PUBLISH_CONFLICT',
        message:
          'The schema, Draft or published content changed during this request. Reload and try again.',
      });
    }

    return this.toResponse(
      pagePublicId,
      updatedPageData,
    );
  }

  private assertSchemaConfigured(
    pageData: PageDataDocument,
  ): asserts pageData is PageDataDocument & {
    schemaDefinition: Record<string, unknown>;
  } {
    if (
      pageData.schemaDefinition === null ||
      !pageData.schemaHash ||
      pageData.schemaVersion < 1
    ) {
      throw new ConflictException({
        code: 'SCHEMA_NOT_CONFIGURED',
        message:
          'A valid page schema must be saved before content can be edited or published.',
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
  ): PageContentResponseDto {
    const publishedFromDraftVersion =
      pageData.publishedFromDraftVersion ?? 0;

    return {
      pageId: pagePublicId,
      schemaVersion: pageData.schemaVersion,
      schemaHash: pageData.schemaHash,
      draftData: pageData.draftData,
      draftVersion: pageData.draftVersion,
      draftUpdatedAt: pageData.draftUpdatedAt ?? null,
      publishedData: pageData.publishedData,
      publishedVersion: pageData.publishedVersion,
      publishedFromDraftVersion,
      publishedAt: pageData.publishedAt,
      hasUnpublishedChanges:
        pageData.draftVersion > publishedFromDraftVersion,
      updatedAt: pageData.updatedAt,
    };
  }
}