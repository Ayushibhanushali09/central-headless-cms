import { NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { PagesService } from '../pages/pages.service';
import type { PageDataDocument } from '../pages/schemas/page-data.schema';
import {
  type PageDocument,
  PageStatus,
  PageVisibility,
} from '../pages/schemas/page.schema';
import { DeliveryService } from './delivery.service';

const pageObjectId = new Types.ObjectId();
const pagePublicId = 'pg_01JTESTPAGE0000000000000000';

function createPage(
  visibility: PageVisibility,
): PageDocument {
  return {
    _id: pageObjectId,
    publicId: pagePublicId,
    projectId: new Types.ObjectId(),
    name: 'Home Page',
    endpointSlug: 'home',
    visibility,
    status: PageStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PageDocument;
}

describe('DeliveryService', () => {
  const pageDataFindOne = jest.fn();

  const pageDataModel = {
    findOne: pageDataFindOne,
  } as unknown as Model<PageDataDocument>;

  const pagesService = {
    findActiveDocument: jest.fn(),
  } as unknown as PagesService;

  let service: DeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeliveryService(
      pageDataModel,
      pagesService,
    );
  });

  it('returns raw published content for a public Page', async () => {
    const publishedData = {
      hero: {
        heading: 'Published Homepage',
      },
    };

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(
        createPage(PageVisibility.Public),
      );

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        pageId: pageObjectId,
        draftData: {
          hero: {
            heading: 'Unpublished Draft',
          },
        },
        publishedData,
        publishedVersion: 1,
      }),
    });

    const result = await service.getPublishedContent(
      pagePublicId,
    );

    expect(result).toEqual(publishedData);
    expect(result).not.toHaveProperty('draftData');
    expect(result).not.toHaveProperty('publishedVersion');
  });

  it('hides private Pages behind a generic 404', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(
        createPage(PageVisibility.Private),
      );

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(pageDataFindOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the Page has no published content', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(
        createPage(PageVisibility.Public),
      );

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        pageId: pageObjectId,
        publishedData: null,
        publishedVersion: 0,
      }),
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when PageData is missing', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(
        createPage(PageVisibility.Public),
      );

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('normalizes an unknown Page to the generic 404', async () => {
    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockRejectedValue(
        new NotFoundException('Page not found.'),
      );

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toMatchObject({
      response: {
        code: 'CONTENT_NOT_FOUND',
        message: 'Published content was not found.',
      },
    });
  });
});