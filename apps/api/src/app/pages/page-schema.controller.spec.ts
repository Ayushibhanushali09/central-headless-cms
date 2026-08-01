import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';

const pageId = 'pg_01JTESTPAGE0000000000000000';
const schemaHash = 'a'.repeat(64);
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

  let controller: PageSchemaController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PageSchemaController(
      pageSchemaService,
    );
  });

  it('delegates schema validation', async () => {
    const result = {
      valid: true,
      schemaHash,
      errors: [],
    };

    jest
      .spyOn(pageSchemaService, 'validateForPage')
      .mockResolvedValue(result);

    await expect(
      controller.validateSchema(pageId, {
        schemaDefinition,
      }),
    ).resolves.toEqual(result);
  });

  it('delegates schema save', async () => {
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
      controller.saveSchema(pageId, {
        schemaDefinition,
      }),
    ).resolves.toEqual(result);
  });

  it('delegates schema retrieval', async () => {
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
      controller.getSchema(pageId),
    ).resolves.toEqual(result);
  });
});