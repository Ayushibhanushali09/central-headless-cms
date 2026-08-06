import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ProjectsService } from '../projects/projects.service';
import { PagesService } from './pages.service';
import type { PageDataDocument } from './schemas/page-data.schema';
import {
  type PageDocument,
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';
import type { ProjectDocument } from '../projects/schemas/project.schema';

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
  const pageDataCreate = jest.fn();

  const pageModel = {
    create: pageCreate,
    find: pageFind,
    findOne: pageFindOne,
    deleteOne: pageDeleteOne,
  } as unknown as Model<PageDocument>;

  const pageDataModel = {
    create: pageDataCreate,
  } as unknown as Model<PageDataDocument>;

  const projectsService = {
    findActiveDocument: jest.fn(),
    findActiveDocumentByInternalId: jest.fn(),
  } as unknown as ProjectsService;

  let service: PagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PagesService(
      pageModel,
      pageDataModel,
      projectsService,
    );
  });

  it('creates a page and its empty PageData document', async () => {
    const page = createPageDocument();

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);
    pageCreate.mockResolvedValue(page);
    pageDataCreate.mockResolvedValue({ pageId: page._id });

    const result = await service.create(
      projectDocument.publicId,
      { name: 'Home Page' },
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

    expect(pageDataCreate).toHaveBeenCalledWith({
      pageId: page._id,
    });

    expect(result.id).toBe(page.publicId);
    expect(result.projectId).toBe(projectDocument.publicId);
    expect(result).not.toHaveProperty('_id');
  });

  it('lists active project pages sorted by updatedAt', async () => {
    const page = createPageDocument();
    const exec = jest.fn().mockResolvedValue([page]);
    const sort = jest.fn().mockReturnValue({ exec });

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);
    pageFind.mockReturnValue({ sort });

    const result = await service.findAll(
      projectDocument.publicId,
    );

    expect(pageFind).toHaveBeenCalledWith({
      projectId: projectObjectId,
      status: PageStatus.Active,
    });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundException for an unknown page', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    pageFindOne.mockReturnValue({ exec });

    await expect(
      service.findOne('pg_unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converts a duplicate slug error to ConflictException', async () => {
    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);
    pageCreate.mockRejectedValue({ code: 11000 });

    await expect(
      service.create(projectDocument.publicId, {
        name: 'Home Page',
        endpointSlug: 'home-page',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});