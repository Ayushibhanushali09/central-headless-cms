import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import { PageSchemaService } from './page-schema.service';
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
    schemaDefinition: null,
    schemaVersion: 0,
    schemaHash: '',
    draftData: null,
    draftVersion: 0,
    publishedData: null,
    publishedVersion: 0,
    publishedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as PageDataDocument;
}

describe('PageSchemaService', () => {
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
    validateSchema: jest.fn(),
    validateContent: jest.fn(),
  } as unknown as SchemaEngineService;

  let service: PageSchemaService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PageSchemaService(
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

  it('validates a page schema without saving it', async () => {
    const validationResult = {
      valid: true,
      schemaHash,
      errors: [],
    };

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue(validationResult);

    await expect(
      service.validateForPage(pagePublicId, {
        schemaDefinition,
      }),
    ).resolves.toEqual(validationResult);

    expect(pageDataFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid schema on save', async () => {
    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: false,
        schemaHash: null,
        errors: [
          {
            path: '#',
            keyword: 'type',
            message: 'Invalid schema.',
          },
        ],
      });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves a valid schema and increments its version', async () => {
    const pageData = createPageData();
    const updatedPageData = createPageData({
      schemaDefinition,
      schemaVersion: 1,
      schemaHash,
      updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    });

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    const updateExec = jest
      .fn()
      .mockResolvedValue(updatedPageData);

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: updateExec,
    });

    const result = await service.saveSchema(
      pagePublicId,
      { schemaDefinition },
    );

    expect(pageDataFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: pageData._id,
        schemaVersion: 0,
      },
      {
        $set: {
          schemaDefinition,
          schemaHash,
        },
        $inc: {
          schemaVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    expect(result.schemaVersion).toBe(1);
    expect(result.schemaHash).toBe(schemaHash);
  });

  it('does not increment the version for the same schema hash', async () => {
    const existingPageData = createPageData({
      schemaDefinition,
      schemaVersion: 1,
      schemaHash,
    });

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingPageData),
    });

    const result = await service.saveSchema(
      pagePublicId,
      { schemaDefinition },
    );

    expect(result.schemaVersion).toBe(1);
    expect(pageDataFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a schema that breaks existing draft content', async () => {
    const pageData = createPageData({
      draftData: {
        oldField: 'existing value',
      },
    });

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
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
            message: 'Required field is missing.',
          },
        ],
      });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a concurrent schema update', async () => {
    const pageData = createPageData();

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    pageDataFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(pageData),
    });

    pageDataFindOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});