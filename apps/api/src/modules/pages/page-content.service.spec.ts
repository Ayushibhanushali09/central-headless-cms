import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { SchemaEngineService } from '../schema-engine/schema-engine.service';
import { PageContentService } from './page-content.service';
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

function createPage(): PageDocument {
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

function createSchema(
  overrides: Partial<PageSchemaRecordDocument> = {},
): PageSchemaRecordDocument {
  return {
    _id: schemaObjectId,
    pageId: pageObjectId,
    schemaDefinition,
    schemaVersion: 1,
    schemaHash,
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
    schemaHash,
    publishedAt: new Date('2026-07-01T11:00:00.000Z'),
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

describe('PageContentService', () => {
  const schemaFindOne = jest.fn();
  const draftFindOne = jest.fn();
  const draftFindOneAndUpdate = jest.fn();
  const publicationFindOne = jest.fn();
  const publicationFindOneAndUpdate = jest.fn();
  const publicationCreate = jest.fn();

  const pageSchemaModel = {
    findOne: schemaFindOne,
  } as unknown as Model<PageSchemaRecordDocument>;

  const pageDraftModel = {
    findOne: draftFindOne,
    findOneAndUpdate: draftFindOneAndUpdate,
  } as unknown as Model<PageDraftDocument>;

  const pagePublicationModel = {
    findOne: publicationFindOne,
    findOneAndUpdate: publicationFindOneAndUpdate,
    create: publicationCreate,
  } as unknown as Model<PagePublicationDocument>;

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
      pageSchemaModel,
      pageDraftModel,
      pagePublicationModel,
      pagesService,
      schemaEngineService,
    );

    jest
      .spyOn(pagesService, 'findActiveDocument')
      .mockResolvedValue(createPage());

    schemaFindOne.mockReturnValue(
      queryResult(createSchema()),
    );
    draftFindOne.mockReturnValue(
      queryResult(createDraft()),
    );
    publicationFindOne.mockReturnValue(
      queryResult(null),
    );
  });

  it('returns the current management content state', async () => {
    const result = await service.getContent(pagePublicId);

    expect(result.pageId).toBe(pagePublicId);
    expect(result.schemaVersion).toBe(1);
    expect(result.draftData).toBeNull();
    expect(result.publishedData).toBeNull();
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('requires a saved Schema before saving content', async () => {
    schemaFindOne.mockReturnValue(
      queryResult(
        createSchema({
          schemaDefinition: null,
          schemaVersion: 0,
          schemaHash: '',
        }),
      ),
    );

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: { heading: 'Welcome' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a Draft whose schemaVersion is out of sync', async () => {
    draftFindOne.mockReturnValue(
      queryResult(createDraft({ schemaVersion: 0 })),
    );

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: { heading: 'Welcome' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects content that does not match the Schema', async () => {
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

  it('saves a valid Draft and increments draftVersion', async () => {
    const contentData = { heading: 'Welcome' };
    const updatedDraft = createDraft({
      draftData: contentData,
      draftVersion: 1,
      draftUpdatedAt: new Date(),
      updatedAt: new Date(),
    });

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    draftFindOneAndUpdate.mockReturnValue(
      queryResult(updatedDraft),
    );

    const result = await service.saveDraft(
      pagePublicId,
      { contentData },
    );

    expect(draftFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: draftObjectId,
        schemaVersion: 1,
        draftVersion: 0,
      },
      {
        $set: {
          draftData: contentData,
          draftUpdatedAt: expect.any(Date),
          updatedBy: null,
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

  it('rejects a concurrent Draft update', async () => {
    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    draftFindOneAndUpdate.mockReturnValue(
      queryResult(null),
    );

    await expect(
      service.saveDraft(pagePublicId, {
        contentData: { heading: 'Welcome' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the first Publication from a reviewed Draft', async () => {
    const draftData = { heading: 'Welcome' };
    const draft = createDraft({
      draftData,
      draftVersion: 2,
    });
    const publication = createPublication({
      publishedData: draftData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
    });

    draftFindOne.mockReturnValue(queryResult(draft));

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    publicationCreate.mockResolvedValue(publication);

    const result = await service.publish(
      pagePublicId,
      { expectedDraftVersion: 2 },
    );

    expect(publicationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: pageObjectId,
        pagePublicId,
        projectId: projectObjectId,
        visibility: PageVisibility.Public,
        status: PublicationStatus.Published,
        publishedData: draftData,
        publishedVersion: 1,
        publishedFromDraftVersion: 2,
        schemaHash,
        publishedAt: expect.any(Date),
        publishedBy: null,
      }),
    );

    expect(result.publishedVersion).toBe(1);
    expect(result.publishedFromDraftVersion).toBe(2);
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('updates an existing Publication atomically', async () => {
    const draftData = { heading: 'Updated Heading' };
    const draft = createDraft({
      draftData,
      draftVersion: 2,
    });
    const oldPublication = createPublication({
      publishedVersion: 1,
      publishedFromDraftVersion: 1,
    });
    const updatedPublication = createPublication({
      publishedData: draftData,
      publishedVersion: 2,
      publishedFromDraftVersion: 2,
      updatedAt: new Date(),
    });

    draftFindOne.mockReturnValue(queryResult(draft));
    publicationFindOne.mockReturnValue(
      queryResult(oldPublication),
    );

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    publicationFindOneAndUpdate.mockReturnValue(
      queryResult(updatedPublication),
    );

    const result = await service.publish(
      pagePublicId,
      { expectedDraftVersion: 2 },
    );

    expect(
      publicationFindOneAndUpdate,
    ).toHaveBeenCalledWith(
      {
        _id: oldPublication._id,
        publishedVersion: 1,
        publishedFromDraftVersion: 1,
        schemaHash: oldPublication.schemaHash,
      },
      {
        $set: {
          pagePublicId,
          projectId: projectObjectId,
          visibility: PageVisibility.Public,
          status: PublicationStatus.Published,
          publishedData: draftData,
          publishedFromDraftVersion: 2,
          schemaHash,
          publishedAt: expect.any(Date),
          publishedBy: null,
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

    expect(result.publishedVersion).toBe(2);
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('returns current Publication when the same Draft is published again', async () => {
    const draftData = { heading: 'Welcome' };
    const draft = createDraft({
      draftData,
      draftVersion: 2,
    });
    const publication = createPublication({
      publishedData: draftData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
      schemaHash,
      visibility: PageVisibility.Public,
      status: PublicationStatus.Published,
    });

    draftFindOne.mockReturnValue(queryResult(draft));
    publicationFindOne.mockReturnValue(
      queryResult(publication),
    );

    const result = await service.publish(
      pagePublicId,
      { expectedDraftVersion: 2 },
    );

    expect(publicationCreate).not.toHaveBeenCalled();
    expect(
      publicationFindOneAndUpdate,
    ).not.toHaveBeenCalled();
    expect(result.publishedVersion).toBe(1);
    expect(result.hasUnpublishedChanges).toBe(false);
  });

  it('rejects a stale expected Draft version', async () => {
    draftFindOne.mockReturnValue(
      queryResult(
        createDraft({
          draftData: { heading: 'Latest Draft' },
          draftVersion: 3,
        }),
      ),
    );

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects publishing when no Draft exists', async () => {
    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a Draft that no longer matches the Schema', async () => {
    draftFindOne.mockReturnValue(
      queryResult(
        createDraft({
          draftData: { oldField: 'Invalid content' },
          draftVersion: 1,
        }),
      ),
    );

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

  it('rejects a concurrent Publication update', async () => {
    const draft = createDraft({
      draftData: { heading: 'Welcome' },
      draftVersion: 2,
    });
    const publication = createPublication({
      publishedVersion: 1,
      publishedFromDraftVersion: 1,
    });

    draftFindOne.mockReturnValue(queryResult(draft));
    publicationFindOne.mockReturnValue(
      queryResult(publication),
    );

    jest
      .spyOn(schemaEngineService, 'validateContent')
      .mockReturnValue({
        valid: true,
        schemaHash,
        errors: [],
      });

    publicationFindOneAndUpdate.mockReturnValue(
      queryResult(null),
    );

    await expect(
      service.publish(pagePublicId, {
        expectedDraftVersion: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
