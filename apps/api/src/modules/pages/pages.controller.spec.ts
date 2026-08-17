import { Types } from 'mongoose';

import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectAuthorizationService } from '../project-members/project-authorization.service';
import {
  PROJECT_ADMIN_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import type { ProjectDocument } from '../projects/schemas/project.schema';
import { ProjectsService } from '../projects/projects.service';
import { UserStatus } from '../users/schemas/user.schema';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import {
  type PageDocument,
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';

const projectObjectId = new Types.ObjectId();
const pageObjectId = new Types.ObjectId();

const authenticatedUser: AuthenticatedUser = {
  id: 'usr_01JTESTUSER000000000000000',
  name: 'Test User',
  email: 'test@example.com',
  status: UserStatus.Active,
};

const projectDocument = {
  _id: projectObjectId,
  publicId: 'prj_01JTESTPROJECT000000000000',
} as ProjectDocument;

const pageDocument = {
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

const pageResponse = {
  id: 'pg_01JTESTPAGE0000000000000000',
  projectId: 'prj_01JTESTPROJECT000000000000',
  name: 'Home Page',
  endpointSlug: 'home-page',
  visibility: PageVisibility.Private,
  status: PageStatus.Active,
  deliveryEndpoint:
    '/v1/content/pg_01JTESTPAGE0000000000000000',
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  updatedAt: new Date('2026-07-02T10:00:00.000Z'),
};

describe('PagesController', () => {
  const pagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findActiveDocument: jest.fn(),
  } as unknown as PagesService;

  const projectsService = {
    findActiveDocument: jest.fn(),
  } as unknown as ProjectsService;

  const authorizationService = {
    requireRoles: jest.fn(),
  } as unknown as ProjectAuthorizationService;

  let controller: PagesController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new PagesController(
      pagesService,
      projectsService,
      authorizationService,
    );
  });

  it('authorizes Owner/Admin and delegates page creation', async () => {
    const dto = {
      name: 'Home Page',
    };

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    jest
      .spyOn(pagesService, 'create')
      .mockResolvedValue(pageResponse);

    await expect(
      controller.create(
        pageResponse.projectId,
        dto,
        authenticatedUser,
      ),
    ).resolves.toEqual(pageResponse);

    expect(
      projectsService.findActiveDocument,
    ).toHaveBeenCalledWith(pageResponse.projectId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_ADMIN_ROLES,
    );

    expect(pagesService.create).toHaveBeenCalledWith(
      pageResponse.projectId,
      dto,
    );
  });

  it('authorizes Project readers and delegates page listing', async () => {
    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(projectDocument);

    jest
      .spyOn(pagesService, 'findAll')
      .mockResolvedValue([pageResponse]);

    await expect(
      controller.findAll(
        pageResponse.projectId,
        authenticatedUser,
      ),
    ).resolves.toEqual([pageResponse]);

    expect(
      projectsService.findActiveDocument,
    ).toHaveBeenCalledWith(pageResponse.projectId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_READ_ROLES,
    );

    expect(pagesService.findAll).toHaveBeenCalledWith(
      pageResponse.projectId,
    );
  });

  it('authorizes Project readers and delegates page lookup', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(pageDocument);

    jest
      .spyOn(pagesService, 'findOne')
      .mockResolvedValue(pageResponse);

    await expect(
      controller.findOne(
        pageResponse.id,
        authenticatedUser,
      ),
    ).resolves.toEqual(pageResponse);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageResponse.id);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_READ_ROLES,
    );

    expect(pagesService.findOne).toHaveBeenCalledWith(
      pageResponse.id,
    );
  });
});