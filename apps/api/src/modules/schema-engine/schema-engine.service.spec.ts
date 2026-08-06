import { ConfigService } from '@nestjs/config';

import { SchemaEngineService } from './schema-engine.service';

const validSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['hero'],
  properties: {
    hero: {
      type: 'object',
      additionalProperties: false,
      required: ['heading'],
      properties: {
        heading: {
          type: 'string',
          minLength: 1,
          maxLength: 120,
        },
        imageUrl: {
          type: 'string',
          format: 'uri',
          'x-cms-widget': 'image',
        },
      },
    },
  },
};

describe('SchemaEngineService', () => {
  let service: SchemaEngineService;

  beforeEach(() => {
    const configService = new ConfigService({
      MAX_SCHEMA_BYTES: 100_000,
      MAX_CONTENT_BYTES: 1_000_000,
      MAX_SCHEMA_DEPTH: 12,
      MAX_CONTENT_DEPTH: 20,
    });

    service = new SchemaEngineService(configService);
  });

  it('validates and hashes a supported schema', () => {
    const result = service.validateSchema(validSchema);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.schemaHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates the same hash regardless of object key order', () => {
    const firstHash = service.calculateSchemaHash({
      type: 'string',
      title: 'Heading',
    });

    const secondHash = service.calculateSchemaHash({
      title: 'Heading',
      type: 'string',
    });

    expect(firstHash).toBe(secondHash);
  });

  it('rejects a schema whose root is not an object type', () => {
    const result = service.validateSchema({
      type: 'string',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'The root schema type must be object.',
        }),
      ]),
    );
  });

  it('requires additionalProperties false for object schemas', () => {
    const result = service.validateSchema({
      type: 'object',
      properties: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'additionalProperties',
        }),
      ]),
    );
  });

  it('rejects remote references', () => {
    const result = service.validateSchema({
      type: 'object',
      additionalProperties: false,
      properties: {
        external: {
          $ref: 'https://example.com/schema.json',
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: '$ref',
        }),
      ]),
    );
  });

  it('rejects unsupported conditional/composition keywords', () => {
    const result = service.validateSchema({
      type: 'object',
      additionalProperties: false,
      properties: {},
      oneOf: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'oneOf',
        }),
      ]),
    );
  });

  it('rejects dangerous schema property names', () => {
    const dangerousSchema = JSON.parse(
      '{"type":"object","additionalProperties":false,"properties":{"__proto__":{"type":"string"}}}',
    ) as unknown;

    const result = service.validateSchema(dangerousSchema);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'propertyName',
        }),
      ]),
    );
  });

  it('accepts content that matches the schema', () => {
    const result = service.validateContent(validSchema, {
      hero: {
        heading: 'Welcome',
        imageUrl: 'https://example.com/hero.jpg',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects content missing required data', () => {
    const result = service.validateContent(validSchema, {
      hero: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'required',
        }),
      ]),
    );
  });

  it('rejects additional content properties', () => {
    const result = service.validateContent(validSchema, {
      hero: {
        heading: 'Welcome',
        internalSecret: 'must not be accepted',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: 'additionalProperties',
        }),
      ]),
    );
  });
});