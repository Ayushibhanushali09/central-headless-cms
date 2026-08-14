import { NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  type PagePublicationDocument,
  PublicationStatus,
} from '../pages/schemas/page-publication.schema';
import { PageVisibility } from '../pages/schemas/page.schema';
import { DeliveryService } from './delivery.service';

const pageObjectId = new Types.ObjectId();
const projectObjectId = new Types.ObjectId();

const pagePublicId =
  'pg_01JTESTPAGE0000000000000000';

function createPublication(
  overrides: Partial<PagePublicationDocument> = {},
): PagePublicationDocument {
  return {
    _id: new Types.ObjectId(),
    pageId: pageObjectId,
    pagePublicId,
    projectId: projectObjectId,
    visibility: PageVisibility.Public,
    status: PublicationStatus.Published,
    publishedData: {
      hero: {
        heading: 'Published Homepage',
      },
    },
    publishedVersion: 1,
    publishedFromDraftVersion: 1,
    schemaHash: 'a'.repeat(64),
    publishedAt: new Date(
      '2026-07-01T10:00:00.000Z',
    ),
    publishedBy: null,
    createdAt: new Date(
      '2026-07-01T10:00:00.000Z',
    ),
    updatedAt: new Date(
      '2026-07-01T10:00:00.000Z',
    ),
    ...overrides,
  } as PagePublicationDocument;
}

describe('DeliveryService', () => {
  const publicationFindOne = jest.fn();
  const publicationSelect = jest.fn();

  const pagePublicationModel = {
    findOne: publicationFindOne,
  } as unknown as Model<PagePublicationDocument>;

  let service: DeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new DeliveryService(
      pagePublicationModel,
    );
  });

  it('returns raw Published content from one indexed query', async () => {
    const publication = createPublication();

    const exec = jest
      .fn()
      .mockResolvedValue(publication);

    publicationSelect.mockReturnValue({
      exec,
    });

    publicationFindOne.mockReturnValue({
      select: publicationSelect,
    });

    const result =
      await service.getPublishedContent(
        pagePublicId,
      );

    expect(publicationFindOne).toHaveBeenCalledWith({
      pagePublicId,
      visibility: PageVisibility.Public,
      status: PublicationStatus.Published,
      publishedVersion: {
        $gte: 1,
      },
    });

    expect(publicationSelect).toHaveBeenCalledWith({
      publishedData: 1,
    });

    expect(result).toEqual(
      publication.publishedData,
    );

    expect(result).not.toHaveProperty('draftData');
    expect(result).not.toHaveProperty(
      'publishedVersion',
    );
    expect(result).not.toHaveProperty('_id');
  });

  it('returns generic 404 when no public Publication exists', async () => {
    const exec = jest.fn().mockResolvedValue(null);

    publicationSelect.mockReturnValue({
      exec,
    });

    publicationFindOne.mockReturnValue({
      select: publicationSelect,
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not return a private Publication', async () => {
    const exec = jest.fn().mockResolvedValue(null);

    publicationSelect.mockReturnValue({
      exec,
    });

    publicationFindOne.mockReturnValue({
      select: publicationSelect,
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toMatchObject({
      response: {
        code: 'CONTENT_NOT_FOUND',
        message:
          'Published content was not found.',
      },
    });

    expect(publicationFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: PageVisibility.Public,
      }),
    );
  });

  it('requires Published status', async () => {
    const exec = jest.fn().mockResolvedValue(null);

    publicationSelect.mockReturnValue({
      exec,
    });

    publicationFindOne.mockReturnValue({
      select: publicationSelect,
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(publicationFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PublicationStatus.Published,
      }),
    );
  });

  it('requires a positive Published version', async () => {
    const exec = jest.fn().mockResolvedValue(null);

    publicationSelect.mockReturnValue({
      exec,
    });

    publicationFindOne.mockReturnValue({
      select: publicationSelect,
    });

    await expect(
      service.getPublishedContent(pagePublicId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(publicationFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedVersion: {
          $gte: 1,
        },
      }),
    );
  });
});