import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import { PageSchemaService } from './page-schema.service';
import { PagesService } from './pages.service';
import type { PageDraftDocument } from './schemas/page-draft.schema';

import {
  type PagePublicationDocument,
  PublicationStatus,
} from './schemas/page-publication.schema';

import type { PageSchemaRecordDocument } from './schemas/page-schema-record.schema';

import {
  type PageDocument,
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';

const pageObjectId = new Types.ObjectId();
const schemaObjectId = new Types.ObjectId();
const draftObjectId = new Types.ObjectId();
const publicationObjectId = new Types.ObjectId();
const projectObjectId = new Types.ObjectId();

const pagePublicId =
  'pg_01JTESTPAGE0000000000000000';

const newSchemaHash = 'a'.repeat(64);
const oldSchemaHash = 'b'.repeat(64);

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

const previousSchemaDefinition = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

function createPageDocument(): PageDocument {
  return {
    _id: pageObjectId,
    publicId: pagePublicId,
    projectId: projectObjectId,
    name: 'Home Page',
    endpointSlug: 'home',
    visibility: PageVisibility.Public,
    status: PageStatus.Active,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
  } as PageDocument;
}

function createSchemaRecord(
  overrides: Partial<PageSchemaRecordDocument> = {},
): PageSchemaRecordDocument {
  return {
    _id: schemaObjectId,
    pageId: pageObjectId,
    schemaDefinition: previousSchemaDefinition,
    schemaVersion: 1,
    schemaHash: oldSchemaHash,
    updatedBy: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as PageSchemaRecordDocument;
}

function createDraft(
  overrides: Partial<PageDraftDocument> = {},
): PageDraftDocument {
  return {
    _id: draftObjectId,
    pageId: pageObjectId,
    schemaVersion: 1,
    draftData: null,
    draftVersion: 0,
    draftUpdatedAt: null,
    updatedBy: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as PageDraftDocument;
}

function createPublication(
  overrides: Partial<PagePublicationDocument> = {},
): PagePublicationDocument {
  return {
    _id: publicationObjectId,
    pageId: pageObjectId,
    pagePublicId,
    projectId: projectObjectId,
    visibility: PageVisibility.Public,
    status: PublicationStatus.Published,
    publishedData: {
      heading: 'Published Heading',
    },
    publishedVersion: 1,
    publishedFromDraftVersion: 1,
    schemaHash: oldSchemaHash,
    publishedAt: new Date(
      '2026-07-01T11:00:00.000Z',
    ),
    publishedBy: null,
    createdAt: new Date('2026-07-01T11:00:00.000Z'),
    updatedAt: new Date('2026-07-01T11:00:00.000Z'),
    ...overrides,
  } as PagePublicationDocument;
}

function queryResult<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('PageSchemaService', () => {
  const schemaFindOne = jest.fn();
  const schemaFindOneAndUpdate = jest.fn();
  const schemaUpdateOne = jest.fn();

  const draftFindOne = jest.fn();
  const draftUpdateOne = jest.fn();

  const publicationFindOne = jest.fn();

  const pageSchemaModel = {
    findOne: schemaFindOne,
    findOneAndUpdate: schemaFindOneAndUpdate,
    updateOne: schemaUpdateOne,
  } as unknown as Model<PageSchemaRecordDocument>;

  const pageDraftModel = {
    findOne: draftFindOne,
    updateOne: draftUpdateOne,
  } as unknown as Model<PageDraftDocument>;

  const pagePublicationModel = {
    findOne: publicationFindOne,
  } as unknown as Model<PagePublicationDocument>;

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
      pageSchemaModel,
      pageDraftModel,
      pagePublicationModel,
      pagesService,
      schemaEngineService,
    );

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(createPageDocument());

    schemaFindOne.mockReturnValue(
      queryResult(createSchemaRecord()),
    );

    draftFindOne.mockReturnValue(
      queryResult(createDraft()),
    );

    publicationFindOne.mockReturnValue(
      queryResult(null),
    );

    draftUpdateOne.mockReturnValue(
      queryResult({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
      }),
    );

    schemaUpdateOne.mockReturnValue(
      queryResult({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
      }),
    );
  });

  it('validates a Page Schema without saving it', async () => {
    const validationResult = {
      valid: true,
      schemaHash: newSchemaHash,
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

    expect(
      schemaFindOneAndUpdate,
    ).not.toHaveBeenCalled();

    expect(draftUpdateOne).not.toHaveBeenCalled();
  });

  it('returns the current Page Schema', async () => {
    const currentSchema = createSchemaRecord();

    schemaFindOne.mockReturnValue(
      queryResult(currentSchema),
    );

    const result = await service.getSchema(
      pagePublicId,
    );

    expect(result).toEqual({
      pageId: pagePublicId,
      schemaDefinition:
        currentSchema.schemaDefinition,
      schemaVersion:
        currentSchema.schemaVersion,
      schemaHash:
        currentSchema.schemaHash,
      updatedAt:
        currentSchema.updatedAt,
    });
  });

  it('rejects an invalid Schema on save', async () => {
    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: false,
        schemaHash: null,
        errors: [
          {
            path: '#',
            keyword: 'type',
            message: 'Invalid Schema.',
          },
        ],
      });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(schemaFindOne).not.toHaveBeenCalled();
    expect(
      schemaFindOneAndUpdate,
    ).not.toHaveBeenCalled();
  });

  it('saves a valid Schema and synchronizes Draft schemaVersion', async () => {
    const currentSchema = createSchemaRecord({
      schemaVersion: 1,
      schemaHash: oldSchemaHash,
    });

    const currentDraft = createDraft({
      schemaVersion: 1,
    });

    const updatedSchema = createSchemaRecord({
      schemaDefinition,
      schemaVersion: 2,
      schemaHash: newSchemaHash,
      updatedAt: new Date(
        '2026-07-02T10:00:00.000Z',
      ),
    });

    schemaFindOne.mockReturnValue(
      queryResult(currentSchema),
    );

    draftFindOne.mockReturnValue(
      queryResult(currentDraft),
    );

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    schemaFindOneAndUpdate.mockReturnValue(
      queryResult(updatedSchema),
    );

    const result = await service.saveSchema(
      pagePublicId,
      {
        schemaDefinition,
      },
    );

    expect(
      schemaFindOneAndUpdate,
    ).toHaveBeenCalledWith(
      {
        _id: currentSchema._id,
        schemaVersion: 1,
      },
      {
        $set: {
          schemaDefinition,
          schemaHash: newSchemaHash,
          updatedBy: null,
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

    expect(draftUpdateOne).toHaveBeenCalledWith(
      {
        _id: currentDraft._id,
        schemaVersion: 1,
      },
      {
        $set: {
          schemaVersion: 2,
        },
      },
      {
        runValidators: true,
      },
    );

    expect(result.schemaVersion).toBe(2);
    expect(result.schemaHash).toBe(
      newSchemaHash,
    );
  });

  it('does not increment version for the same Schema hash', async () => {
    const existingSchema = createSchemaRecord({
      schemaDefinition,
      schemaVersion: 2,
      schemaHash: newSchemaHash,
    });

    const existingDraft = createDraft({
      schemaVersion: 2,
    });

    schemaFindOne.mockReturnValue(
      queryResult(existingSchema),
    );

    draftFindOne.mockReturnValue(
      queryResult(existingDraft),
    );

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    const result = await service.saveSchema(
      pagePublicId,
      {
        schemaDefinition,
      },
    );

    expect(result.schemaVersion).toBe(2);

    expect(
      schemaFindOneAndUpdate,
    ).not.toHaveBeenCalled();

    expect(draftUpdateOne).not.toHaveBeenCalled();
  });

  it('rejects a Schema that breaks existing Draft content', async () => {
    const currentDraft = createDraft({
      schemaVersion: 1,
      draftData: {
        oldField: 'Existing Draft value',
      },
      draftVersion: 1,
    });

    draftFindOne.mockReturnValue(
      queryResult(currentDraft),
    );

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: false,
        schemaHash: newSchemaHash,
        errors: [
          {
            path: '/',
            keyword: 'required',
            message:
              'Required Draft field is missing.',
          },
        ],
      });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      schemaFindOneAndUpdate,
    ).not.toHaveBeenCalled();
  });

  it('rejects a Schema that breaks Published content', async () => {
    const publication = createPublication({
      publishedData: {
        oldField: 'Published value',
      },
    });

    publicationFindOne.mockReturnValue(
      queryResult(publication),
    );

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: false,
        schemaHash: newSchemaHash,
        errors: [
          {
            path: '/',
            keyword: 'required',
            message:
              'Required Published field is missing.',
          },
        ],
      });

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      schemaFindOneAndUpdate,
    ).not.toHaveBeenCalled();
  });

  it('rejects a concurrent Schema update', async () => {
    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    schemaFindOneAndUpdate.mockReturnValue(
      queryResult(null),
    );

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back Schema when Draft version synchronization fails', async () => {
    const currentSchema = createSchemaRecord({
      schemaVersion: 1,
      schemaHash: oldSchemaHash,
    });

    const updatedSchema = createSchemaRecord({
      schemaDefinition,
      schemaVersion: 2,
      schemaHash: newSchemaHash,
    });

    schemaFindOne.mockReturnValue(
      queryResult(currentSchema),
    );

    draftFindOne.mockReturnValue(
      queryResult(
        createDraft({
          schemaVersion: 1,
        }),
      ),
    );

    jest
      .spyOn(schemaEngineService, 'validateSchema')
      .mockReturnValue({
        valid: true,
        schemaHash: newSchemaHash,
        errors: [],
      });

    schemaFindOneAndUpdate.mockReturnValue(
      queryResult(updatedSchema),
    );

    draftUpdateOne.mockReturnValue(
      queryResult({
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
      }),
    );

    await expect(
      service.saveSchema(pagePublicId, {
        schemaDefinition,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(schemaUpdateOne).toHaveBeenCalledWith(
      {
        _id: updatedSchema._id,
        schemaVersion:
          updatedSchema.schemaVersion,
      },
      {
        $set: {
          schemaDefinition:
            currentSchema.schemaDefinition,
          schemaHash:
            currentSchema.schemaHash,
          schemaVersion:
            currentSchema.schemaVersion,
          updatedBy: null,
        },
      },
      {
        runValidators: true,
      },
    );
  });
});