import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ulid } from 'ulid';

import { ProjectsService } from '../projects/projects.service';
import { CreatePageDto } from './dto/create-page.dto';
import { PageResponseDto } from './dto/page-response.dto';
import {
  PageDraft,
  type PageDraftDocument,
} from './schemas/page-draft.schema';
import {
  PageSchemaRecord,
  type PageSchemaRecordDocument,
} from './schemas/page-schema-record.schema';
import {
  Page,
  type PageDocument,
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name)
    private readonly pageModel: Model<PageDocument>,

    @InjectModel(PageSchemaRecord.name)
    private readonly pageSchemaModel: Model<PageSchemaRecordDocument>,

    @InjectModel(PageDraft.name)
    private readonly pageDraftModel: Model<PageDraftDocument>,

    private readonly projectsService: ProjectsService,
  ) {}

  async create(
    projectPublicId: string,
    createPageDto: CreatePageDto,
  ): Promise<PageResponseDto> {
    const project =
      await this.projectsService.findActiveDocument(
        projectPublicId,
      );

    const endpointSlug =
      createPageDto.endpointSlug ??
      this.createSlug(createPageDto.name);

    let createdPage: PageDocument | null = null;

    try {
      createdPage = await this.pageModel.create({
        publicId: `pg_${ulid()}`,
        projectId: project._id,
        name: createPageDto.name.trim(),
        endpointSlug,
        visibility:
          createPageDto.visibility ??
          PageVisibility.Private,
        status: PageStatus.Active,
      });

      await Promise.all([
        this.pageSchemaModel.create({
          pageId: createdPage._id,
          schemaDefinition: null,
          schemaVersion: 0,
          schemaHash: '',
          updatedBy: null,
        }),

        this.pageDraftModel.create({
          pageId: createdPage._id,
          schemaVersion: 0,
          draftData: null,
          draftVersion: 0,
          draftUpdatedAt: null,
          updatedBy: null,
        }),
      ]);

      return this.toResponse(
        createdPage,
        project.publicId,
      );
    } catch (error: unknown) {
      if (createdPage) {
        await Promise.allSettled([
          this.pageSchemaModel
            .deleteOne({
              pageId: createdPage._id,
            })
            .exec(),

          this.pageDraftModel
            .deleteOne({
              pageId: createdPage._id,
            })
            .exec(),

          this.pageModel
            .deleteOne({
              _id: createdPage._id,
            })
            .exec(),
        ]);
      }

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          `A page with endpoint slug '${endpointSlug}' already exists in this project.`,
        );
      }

      throw error;
    }
  }

  async findAll(
    projectPublicId: string,
  ): Promise<PageResponseDto[]> {
    const project =
      await this.projectsService.findActiveDocument(
        projectPublicId,
      );

    const pages = await this.pageModel
      .find({
        projectId: project._id,
        status: PageStatus.Active,
      })
      .sort({
        updatedAt: -1,
      })
      .exec();

    return pages.map((page) =>
      this.toResponse(page, project.publicId),
    );
  }

  async findOne(
    pagePublicId: string,
  ): Promise<PageResponseDto> {
    const page = await this.findActiveDocument(
      pagePublicId,
    );

    const project =
      await this.projectsService.findActiveDocumentByInternalId(
        page.projectId,
      );

    return this.toResponse(page, project.publicId);
  }

  async findActiveDocument(
    pagePublicId: string,
  ): Promise<PageDocument> {
    const page = await this.pageModel
      .findOne({
        publicId: pagePublicId,
        status: PageStatus.Active,
      })
      .exec();

    if (!page) {
      throw new NotFoundException(
        `Page '${pagePublicId}' was not found.`,
      );
    }

    return page;
  }

  private createSlug(name: string): string {
    const slug = name
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || `page-${ulid().toLowerCase()}`;
  }

  private toResponse(
    page: PageDocument,
    projectPublicId: string,
  ): PageResponseDto {
    return {
      id: page.publicId,
      projectId: projectPublicId,
      name: page.name,
      endpointSlug: page.endpointSlug,
      visibility: page.visibility,
      status: page.status,
      deliveryEndpoint: `/v1/content/${page.publicId}`,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
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