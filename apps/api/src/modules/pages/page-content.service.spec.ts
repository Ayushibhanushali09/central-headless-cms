import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import { PageContentService } from './page-content.service';
import { PagesService } from './pages.service';
import type { PageDataDocument } from './schemas/page-data.schema';
import type { PageDocument } from './schemas/page.schema';

const pageObjectId = new Types.ObjectId();
const pageDataObjectId = new Types.ObjectId();
const pagePublicId = 'pg_01JTESTPAGE0000000000000000';
const schemaHash = 'a'.repeat(64);

const schemaDefinition = {
  type: 'object',
  additionalProperties: false,
  required: ['heading'],
  properties: {
    heading: {
      type: 'string',
    },
  },
};

function createPageData(
  overrides: Partial<PageDataDocument> = {},
): PageDataDocument {
  return {
    _id: pageDataObjectId,
    pageId: pageObjectId,
    schemaDefinition,
    schemaVersion: 1,
    schemaHash,
    draftData: null,
    draftVersion: 0,
    draftUpdatedAt: null,
    publishedData: null,
    publishedVersion: 0,
    publishedFromDraftVersion: 0,
    publishedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as PageDataDocument;
}

describe('PageContentService', () => {
  const pageDataFindOne = jest.fn();
  const pageDataFindOneAndUpdate = jest.fn();

  const pageDataModel = {
    findOne: pageDataFindOne,
    findOneAndUpdate: pageDataFindOneAndUpdate,
  } as unknown as Model<PageDataDocument>;

  const pagesService = {
    findActiveDocument: jest.fn(),
  } as unknown as PagesService;

  const schemaEngineService = {
    validateContent: jest.fn(),
  } as unknown as SchemaEngineService;

  let service: PageContentService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PageContentService(
      pageDataModel,
      pagesService,
      schemaEngineService,
    );

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue({
        _id: pageObjectId,
        publicId: pagePublicId,
      } as PageDocument);
  });

  it('returns the current management content state', async () => {
    const pageData = createPageData();

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    const result = await service.getContent(pagePublicId);

    expect(result.pageId).toBe(pagePublicId);
    expect(result.draftData).toBeNull();
    expect(result.publishedData).toBeNull();
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('requires a saved schema before saving content', async () => {
    const pageData = createPageData({
      schemaDefinition: null,
      schemaVersion: 0,
      schemaHash: '',
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: { heading: 'Welcome' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects content that does not match the schema', async () => {
    const pageData = createPageData();

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: false,
        schemaHash,
        errors: [
          {
            path: '/heading',
            keyword: 'required',
            message: 'Required property is missing.',
          },
        ],
      });

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves valid Draft and increments draftVersion', async () => {
    const pageData = createPageData();
    const contentData = {
      heading: 'Welcome',
    };
    const updatedPageData = createPageData({
      draftData: contentData,
      draftVersion: 1,
      draftUpdatedAt: new Date(),
      updatedAt: new Date(),
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedPageData),
    });

    const result = await service.saveDraft(
      pagePublicId,
      { contentData },
    );

    expect(pageDataFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: pageData._id,
        schemaVersion: 1,
        draftVersion: 0,
      },
      {
        $set: {
          draftData: contentData,
          draftUpdatedAt: expect.any(Date),
        },
        $inc: {
          draftVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    expect(result.draftVersion).toBe(1);
    expect(result.publishedData).toBeNull();
    expect(result.hasUnpublishedChanges).toBe(true);
  });

  it('rejects a concurrent draft/schema update', async () => {
    const pageData = createPageData();

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: { heading: 'Welcome' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
    it('publishes the reviewed Draft atomically', async () => {
    const draftData = {
      heading: 'Welcome',
    };
    const pageData = createPageData({
      draftData,
      draftVersion: 2,
      publishedVersion: 0,
      publishedFromDraftVersion: 0,
    });
    const publishedPageData = createPageData({
      draftData,
      draftVersion: 2,
      publishedData: draftData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
      publishedAt: new Date(),
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(publishedPageData),
    });

    const result = await service.publish(
      pagePublicId,
      { expectedDraftVersion: 2 },
    );

    expect(pageDataFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: pageData._id,
        schemaVersion: 1,
        draftVersion: 2,
        publishedVersion: 0,
        publishedFromDraftVersion: 0,
      },
      {
        $set: {
          publishedData: draftData,
          publishedFromDraftVersion: 2,
          publishedAt: expect.any(Date),
        },
        $inc: {
          publishedVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    expect(result.publishedVersion).toBe(1);
    expect(result.publishedFromDraftVersion).toBe(2);
    expect(result.publishedData).toEqual(draftData);
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('returns the existing publication when the same Draft is published again', async () => {
    const draftData = {
      heading: 'Welcome',
    };
    const pageData = createPageData({
      draftData,
      draftVersion: 2,
      publishedData: draftData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
      publishedAt: new Date(),
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    const result = await service.publish(
      pagePublicId,
      { expectedDraftVersion: 2 },
    );

    expect(pageDataFindOneAndUpdate).not.toHaveBeenCalled();
    expect(result.publishedVersion).toBe(1);
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('rejects a stale expected Draft version', async () => {
    const pageData = createPageData({
      draftData: {
        heading: 'Latest Draft',
      },
      draftVersion: 3,
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(pageDataFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects publishing when no Draft exists', async () => {
    const pageData = createPageData({
      draftData: null,
      draftVersion: 0,
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a Draft that no longer matches the schema', async () => {
    const pageData = createPageData({
      draftData: {
        oldField: 'invalid content',
      },
      draftVersion: 1,
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: false,
        schemaHash,
        errors: [
          {
            path: '/',
            keyword: 'required',
            message: 'Required content is missing.',
          },
        ],
      });

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a concurrent Publish update', async () => {
    const pageData = createPageData({
      draftData: {
        heading: 'Welcome',
      },
      draftVersion: 1,
    });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});