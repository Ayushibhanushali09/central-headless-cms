import { Types } from 'mongoose';

import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectAuthorizationService } from '../project-members/project-authorization.service';
import {
  PROJECT_ADMIN_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import { UserStatus } from '../users/schemas/user.schema';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PagesService } from './pages.service';
import type { PageDocument } from './schemas/page.schema';

const projectObjectId = new Types.ObjectId();
const pageObjectId = new Types.ObjectId();

const pageId = 'pg_01JTESTPAGE0000000000000000';
const schemaHash = 'a'.repeat(64);

const authenticatedUser: AuthenticatedUser = {
  id: 'usr_01JTESTUSER000000000000000',
  name: 'Test User',
  email: 'test@example.com',
  status: UserStatus.Active,
};

const pageDocument = {
  _id: pageObjectId,
  publicId: pageId,
  projectId: projectObjectId,
} as PageDocument;

const schemaDefinition = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

describe('PageSchemaController', () => {
  const pageSchemaService = {
    validateForPage: jest.fn(),
    saveSchema: jest.fn(),
    getSchema: jest.fn(),
  } as unknown as PageSchemaService;

  const pagesService = {
    findActiveDocument: jest.fn(),
  } as unknown as PagesService;

  const authorizationService = {
    requireRoles: jest.fn(),
  } as unknown as ProjectAuthorizationService;

  let controller: PageSchemaController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new PageSchemaController(
      pageSchemaService,
      pagesService,
      authorizationService,
    );

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(pageDocument);
  });

  it('authorizes and delegates schema validation', async () => {
    const requestDto = {
      schemaDefinition,
    };

    const result = {
      valid: true,
      schemaHash,
      errors: [],
    };

    jest
      .spyOn(pageSchemaService, 'validateForPage')
      .mockResolvedValue(result);

    await expect(
      controller.validateSchema(
        pageId,
        requestDto,
        authenticatedUser,
      ),
    ).resolves.toEqual(result);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_ADMIN_ROLES,
    );

    expect(
      pageSchemaService.validateForPage,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });

  it('authorizes and delegates schema save', async () => {
    const requestDto = {
      schemaDefinition,
    };

    const result = {
      pageId,
      schemaDefinition,
      schemaVersion: 1,
      schemaHash,
      updatedAt: new Date(),
    };

    jest
      .spyOn(pageSchemaService, 'saveSchema')
      .mockResolvedValue(result);

    await expect(
      controller.saveSchema(
        pageId,
        requestDto,
        authenticatedUser,
      ),
    ).resolves.toEqual(result);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_ADMIN_ROLES,
    );

    expect(
      pageSchemaService.saveSchema,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });

  it('authorizes and delegates schema retrieval', async () => {
    const result = {
      pageId,
      schemaDefinition,
      schemaVersion: 1,
      schemaHash,
      updatedAt: new Date(),
    };

    jest
      .spyOn(pageSchemaService, 'getSchema')
      .mockResolvedValue(result);

    await expect(
      controller.getSchema(
        pageId,
        authenticatedUser,
      ),
    ).resolves.toEqual(result);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_READ_ROLES,
    );

    expect(
      pageSchemaService.getSchema,
    ).toHaveBeenCalledWith(pageId);
  });
});