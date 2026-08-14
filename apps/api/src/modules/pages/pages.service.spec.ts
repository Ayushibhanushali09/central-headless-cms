import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ProjectsService } from '../projects/projects.service';
import type { ProjectDocument } from '../projects/schemas/project.schema';
import { PagesService } from './pages.service';
import type { PageDraftDocument } from './schemas/page-draft.schema';
import type { PageSchemaRecordDocument } from './schemas/page-schema-record.schema';
import {
  type PageDocument,
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';

const projectObjectId = new Types.ObjectId();
const pageObjectId = new Types.ObjectId();

const projectDocument = {
  _id: projectObjectId,
  publicId: 'prj_01JTESTPROJECT000000000000',
} as ProjectDocument;

function createPageDocument(): PageDocument {
  return {
    _id: pageObjectId,
    publicId: 'pg_01JTESTPAGE0000000000000000',
    projectId: projectObjectId,
    name: 'Home Page',
    endpointSlug: 'home-page',
    visibility: PageVisibility.Private,
    status: PageStatus.Active,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
  } as PageDocument;
}

describe('PagesService', () => {
  const pageCreate = jest.fn();
  const pageFind = jest.fn();
  const pageFindOne = jest.fn();
  const pageDeleteOne = jest.fn();

  const pageSchemaCreate = jest.fn();
  const pageSchemaDeleteOne = jest.fn();

  const pageDraftCreate = jest.fn();
  const pageDraftDeleteOne = jest.fn();

  const pageModel = {
    create: pageCreate,
    find: pageFind,
    findOne: pageFindOne,
    deleteOne: pageDeleteOne,
  } as unknown as Model<PageDocument>;

  const pageSchemaModel = {
    create: pageSchemaCreate,
    deleteOne: pageSchemaDeleteOne,
  } as unknown as Model<PageSchemaRecordDocument>;

  const pageDraftModel = {
    create: pageDraftCreate,
    deleteOne: pageDraftDeleteOne,
  } as unknown as Model<PageDraftDocument>;

  const projectsService = {
    findActiveDocument: jest.fn(),
    findActiveDocumentByInternalId: jest.fn(),
  } as unknown as ProjectsService;

  let service: PagesService;

  beforeEach(() => {
    jest.clearAllMocks();

    pageDeleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    });

    pageSchemaDeleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    });

    pageDraftDeleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    });

    service = new PagesService(
      pageModel,
      pageSchemaModel,
      pageDraftModel,
      projectsService,
    );
  });

  it('creates a Page with empty Schema and Draft records', async () => {
    const page = createPageDocument();

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    pageCreate.mockResolvedValue(page);

    pageSchemaCreate.mockResolvedValue({
      pageId: page._id,
      schemaDefinition: null,
      schemaVersion: 0,
      schemaHash: '',
      updatedBy: null,
    });

    pageDraftCreate.mockResolvedValue({
      pageId: page._id,
      schemaVersion: 0,
      draftData: null,
      draftVersion: 0,
      draftUpdatedAt: null,
      updatedBy: null,
    });

    const result = await service.create(
      projectDocument.publicId,
      {
        name: 'Home Page',
      },
    );

    expect(pageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.stringMatching(
          /^pg_[0-9A-HJKMNP-TV-Z]{26}$/,
        ),
        projectId: projectObjectId,
        name: 'Home Page',
        endpointSlug: 'home-page',
        visibility: PageVisibility.Private,
        status: PageStatus.Active,
      }),
    );

    expect(pageSchemaCreate).toHaveBeenCalledWith({
      pageId: page._id,
      schemaDefinition: null,
      schemaVersion: 0,
      schemaHash: '',
      updatedBy: null,
    });

    expect(pageDraftCreate).toHaveBeenCalledWith({
      pageId: page._id,
      schemaVersion: 0,
      draftData: null,
      draftVersion: 0,
      draftUpdatedAt: null,
      updatedBy: null,
    });

    expect(result).toEqual({
      id: page.publicId,
      projectId: projectDocument.publicId,
      name: page.name,
      endpointSlug: page.endpointSlug,
      visibility: page.visibility,
      status: page.status,
      deliveryEndpoint: `/v1/content/${page.publicId}`,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    });

    expect(result).not.toHaveProperty('_id');
  });

  it('lists active Project Pages sorted by updatedAt', async () => {
    const page = createPageDocument();

    const exec = jest.fn().mockResolvedValue([page]);
    const sort = jest.fn().mockReturnValue({
      exec,
    });

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    pageFind.mockReturnValue({
      sort,
    });

    const result = await service.findAll(
      projectDocument.publicId,
    );

    expect(pageFind).toHaveBeenCalledWith({
      projectId: projectObjectId,
      status: PageStatus.Active,
    });

    expect(sort).toHaveBeenCalledWith({
      updatedAt: -1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(page.publicId);
  });

  it('returns one active Page with public Project ID', async () => {
    const page = createPageDocument();

    pageFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(page),
    });

    jest
      .spyOn(
        projectsService,
        'findActiveDocumentByInternalId',
      )
      .mockResolvedValue(projectDocument);

    const result = await service.findOne(
      page.publicId,
    );

    expect(result.id).toBe(page.publicId);
    expect(result.projectId).toBe(
      projectDocument.publicId,
    );

    expect(
      projectsService.findActiveDocumentByInternalId,
    ).toHaveBeenCalledWith(page.projectId);
  });

  it('throws NotFoundException for an unknown Page', async () => {
    pageFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.findOne('pg_unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converts duplicate slug error to ConflictException', async () => {
    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    pageCreate.mockRejectedValue({
      code: 11000,
    });

    await expect(
      service.create(projectDocument.publicId, {
        name: 'Home Page',
        endpointSlug: 'home-page',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(pageSchemaCreate).not.toHaveBeenCalled();
    expect(pageDraftCreate).not.toHaveBeenCalled();
  });

  it('cleans up partial records when Draft creation fails', async () => {
    const page = createPageDocument();

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    pageCreate.mockResolvedValue(page);

    pageSchemaCreate.mockResolvedValue({
      pageId: page._id,
    });

    pageDraftCreate.mockRejectedValue(
      new Error('Draft creation failed'),
    );

    await expect(
      service.create(projectDocument.publicId, {
        name: 'Home Page',
      }),
    ).rejects.toThrow('Draft creation failed');

    expect(pageSchemaDeleteOne).toHaveBeenCalledWith({
      pageId: page._id,
    });

    expect(pageDraftDeleteOne).toHaveBeenCalledWith({
      pageId: page._id,
    });

    expect(pageDeleteOne).toHaveBeenCalledWith({
      _id: page._id,
    });
  });
});