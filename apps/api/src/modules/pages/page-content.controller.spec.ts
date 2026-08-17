import { Types } from 'mongoose';

import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectAuthorizationService } from '../project-members/project-authorization.service';
import {
  PROJECT_DRAFT_WRITE_ROLES,
  PROJECT_PUBLISH_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import { UserStatus } from '../users/schemas/user.schema';
import { PageContentController } from './page-content.controller';
import { PageContentService } from './page-content.service';
import { PagesService } from './pages.service';
import type { PageDocument } from './schemas/page.schema';

const pageId = 'pg_01JTESTPAGE0000000000000000';
const projectObjectId = new Types.ObjectId();

const authenticatedUser: AuthenticatedUser = {
  id: 'usr_01JTESTUSER000000000000000',
  name: 'Test User',
  email: 'test@example.com',
  status: UserStatus.Active,
};

const pageDocument = {
  projectId: projectObjectId,
} as unknown as PageDocument;

const contentResponse = {
  pageId,
  schemaVersion: 1,
  schemaHash: 'a'.repeat(64),
  draftData: null,
  draftVersion: 0,
  draftUpdatedAt: null,
  publishedData: null,
  publishedVersion: 0,
  publishedFromDraftVersion: 0,
  publishedAt: null,
  hasUnpublishedChanges: false,
  updatedAt: new Date(),
};

describe('PageContentController', () => {
  const pageContentService = {
    getContent: jest.fn(),
    saveDraft: jest.fn(),
    publish: jest.fn(),
  } as unknown as PageContentService;

  const pagesService = {
    findActiveDocument: jest.fn(),
  } as unknown as PagesService;

  const authorizationService = {
    requireRoles: jest.fn(),
  } as unknown as ProjectAuthorizationService;

  let controller: PageContentController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new PageContentController(
      pageContentService,
      pagesService,
      authorizationService,
    );
  });

  it('delegates authorized Content retrieval', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(pageDocument);

    jest
      .spyOn(pageContentService, 'getContent')
      .mockResolvedValue(contentResponse);

    await expect(
      controller.getContent(pageId, authenticatedUser),
    ).resolves.toEqual(contentResponse);

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
      pageContentService.getContent,
    ).toHaveBeenCalledWith(pageId);
  });

  it('delegates authorized Draft save', async () => {
    const requestDto = {
      contentData: {
        hero: {
          heading: 'Welcome',
        },
      },
    };

    const savedResponse = {
      ...contentResponse,
      draftData: requestDto.contentData,
      draftVersion: 1,
      draftUpdatedAt: new Date(),
      hasUnpublishedChanges: true,
    };

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(pageDocument);

    jest
      .spyOn(pageContentService, 'saveDraft')
      .mockResolvedValue(savedResponse);

    await expect(
      controller.saveDraft(
        pageId,
        requestDto,
        authenticatedUser,
      ),
    ).resolves.toEqual(savedResponse);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_DRAFT_WRITE_ROLES,
    );

    expect(
      pageContentService.saveDraft,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });

  it('delegates authorized Publish', async () => {
    const requestDto = {
      expectedDraftVersion: 2,
    };

    const publishedData = {
      hero: {
        heading: 'Welcome',
      },
    };

    const publishedResponse = {
      ...contentResponse,
      draftData: publishedData,
      draftVersion: 2,
      draftUpdatedAt: new Date(),
      publishedData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
      publishedAt: new Date(),
      hasUnpublishedChanges: false,
    };

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(pageDocument);

    jest
      .spyOn(pageContentService, 'publish')
      .mockResolvedValue(publishedResponse);

    await expect(
      controller.publish(
        pageId,
        requestDto,
        authenticatedUser,
      ),
    ).resolves.toEqual(publishedResponse);

    expect(
      pagesService.findActiveDocument,
    ).toHaveBeenCalledWith(pageId);

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectObjectId,
      PROJECT_PUBLISH_ROLES,
    );

    expect(
      pageContentService.publish,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });
});