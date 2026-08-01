import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { createHash } from 'node:crypto';
import type {
  AnySchema,
  ErrorObject,
  ValidateFunction,
} from 'ajv';

import type {
  ContentValidationResult,
  SchemaValidationResult,
  ValidationIssue,
} from './schema-engine.types';

const DISALLOWED_SCHEMA_KEYWORDS = new Set([
  '$async',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  'dependentSchemas',
  'dependentRequired',
  'pattern',
  'patternProperties',
  'propertyNames',
  'contains',
  'minContains',
  'maxContains',
  'prefixItems',
  'unevaluatedItems',
  'unevaluatedProperties',
]);

const DANGEROUS_PROPERTY_NAMES = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

const ALLOWED_FORMATS = new Set([
  'date',
  'date-time',
  'email',
  'uri',
  'uri-reference',
]);

const ALLOWED_TYPES = new Set([
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
]);

@Injectable()
export class SchemaEngineService {
  private readonly ajv: Ajv2020;
  private readonly validatorCache = new Map<
    string,
    ValidateFunction
  >();

  private readonly maxSchemaBytes: number;
  private readonly maxContentBytes: number;
  private readonly maxSchemaDepth: number;
  private readonly maxContentDepth: number;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.maxSchemaBytes = this.readPositiveInteger(
      'MAX_SCHEMA_BYTES',
      100_000,
    );
    this.maxContentBytes = this.readPositiveInteger(
      'MAX_CONTENT_BYTES',
      1_000_000,
    );
    this.maxSchemaDepth = this.readPositiveInteger(
      'MAX_SCHEMA_DEPTH',
      12,
    );
    this.maxContentDepth = this.readPositiveInteger(
      'MAX_CONTENT_DEPTH',
      20,
    );

    this.ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      validateFormats: true,
      removeAdditional: false,
      coerceTypes: false,
      useDefaults: false,
    });

    addFormats(this.ajv);

    this.ajv.addKeyword({
      keyword: 'x-cms-widget',
      schemaType: 'string',
      valid: true,
      errors: false,
    });
  }

  validateSchema(schema: unknown): SchemaValidationResult {
    const issues: ValidationIssue[] = [];

    if (!this.isPlainObject(schema)) {
      return this.invalidSchema([
        {
          path: '#',
          keyword: 'type',
          message: 'Schema must be a JSON object.',
        },
      ]);
    }

    const schemaSize = this.getJsonSize(schema);

    if (schemaSize === null) {
      return this.invalidSchema([
        {
          path: '#',
          keyword: 'serialization',
          message: 'Schema must be JSON serializable.',
        },
      ]);
    }

    if (schemaSize > this.maxSchemaBytes) {
      issues.push({
        path: '#',
        keyword: 'maxSchemaBytes',
        message: `Schema exceeds the ${this.maxSchemaBytes} byte limit.`,
      });
    }

    if (schema.type !== 'object') {
      issues.push({
        path: '#/type',
        keyword: 'type',
        message: 'The root schema type must be object.',
      });
    }

    this.inspectSchemaNode(schema, '#', 0, issues);

    if (issues.length > 0) {
      return this.invalidSchema(issues);
    }

    try {
      const metaSchemaValid = this.ajv.validateSchema(
        schema as AnySchema,
      );

      if (!metaSchemaValid) {
        return this.invalidSchema(
          this.normalizeAjvErrors(this.ajv.errors),
        );
      }

      const schemaHash = this.calculateSchemaHash(schema);
      const validator = this.ajv.compile(
        schema as AnySchema,
      );

      this.validatorCache.set(schemaHash, validator);

      return {
        valid: true,
        schemaHash,
        errors: [],
      };
    } catch (error: unknown) {
      return this.invalidSchema([
        {
          path: '#',
          keyword: 'compile',
          message:
            error instanceof Error
              ? error.message
              : 'Schema compilation failed.',
        },
      ]);
    }
  }

  validateContent(
    schema: unknown,
    content: unknown,
  ): ContentValidationResult {
    const schemaResult = this.validateSchema(schema);

    if (!schemaResult.valid || !schemaResult.schemaHash) {
      return {
        valid: false,
        schemaHash: schemaResult.schemaHash,
        errors: schemaResult.errors,
      };
    }

    const contentSize = this.getJsonSize(content);

    if (contentSize === null) {
      return {
        valid: false,
        schemaHash: schemaResult.schemaHash,
        errors: [
          {
            path: '/',
            keyword: 'serialization',
            message: 'Content must be JSON serializable.',
          },
        ],
      };
    }

    if (contentSize > this.maxContentBytes) {
      return {
        valid: false,
        schemaHash: schemaResult.schemaHash,
        errors: [
          {
            path: '/',
            keyword: 'maxContentBytes',
            message: `Content exceeds the ${this.maxContentBytes} byte limit.`,
          },
        ],
      };
    }

    const contentIssues: ValidationIssue[] = [];

    this.inspectContentValue(
      content,
      '/',
      0,
      contentIssues,
    );

    if (contentIssues.length > 0) {
      return {
        valid: false,
        schemaHash: schemaResult.schemaHash,
        errors: contentIssues,
      };
    }

    const validator = this.validatorCache.get(
      schemaResult.schemaHash,
    );

    if (!validator) {
      return {
        valid: false,
        schemaHash: schemaResult.schemaHash,
        errors: [
          {
            path: '/',
            keyword: 'validator',
            message: 'Compiled schema validator was not found.',
          },
        ],
      };
    }

    const valid = validator(content);

    return {
      valid: Boolean(valid),
      schemaHash: schemaResult.schemaHash,
      errors: valid
        ? []
        : this.normalizeAjvErrors(validator.errors),
    };
  }

  calculateSchemaHash(schema: unknown): string {
    const canonicalSchema = this.canonicalize(schema);

    return createHash('sha256')
      .update(JSON.stringify(canonicalSchema))
      .digest('hex');
  }

  private inspectSchemaNode(
    schemaNode: Record<string, unknown>,
    path: string,
    depth: number,
    issues: ValidationIssue[],
  ): void {
    if (depth > this.maxSchemaDepth) {
      issues.push({
        path,
        keyword: 'maxSchemaDepth',
        message: `Schema exceeds the maximum depth of ${this.maxSchemaDepth}.`,
      });
      return;
    }

    for (const keyword of Object.keys(schemaNode)) {
      if (DISALLOWED_SCHEMA_KEYWORDS.has(keyword)) {
        issues.push({
          path: `${path}/${keyword}`,
          keyword,
          message: `Schema keyword '${keyword}' is not supported in the MVP.`,
        });
      }
    }

    const schemaType = schemaNode.type;

    if (Array.isArray(schemaType)) {
      issues.push({
        path: `${path}/type`,
        keyword: 'type',
        message: 'Union type arrays are not supported in the MVP.',
      });
    } else if (
      typeof schemaType === 'string' &&
      !ALLOWED_TYPES.has(schemaType)
    ) {
      issues.push({
        path: `${path}/type`,
        keyword: 'type',
        message: `Schema type '${schemaType}' is not supported.`,
      });
    }

    if (
      schemaType === 'object' &&
      schemaNode.additionalProperties !== false
    ) {
      issues.push({
        path: `${path}/additionalProperties`,
        keyword: 'additionalProperties',
        message:
          'Every object schema must set additionalProperties to false.',
      });
    }

    if (
      schemaType === 'array' &&
      !this.isPlainObject(schemaNode.items)
    ) {
      issues.push({
        path: `${path}/items`,
        keyword: 'items',
        message: 'Array schemas must define one object-form items schema.',
      });
    }

    const schemaFormat = schemaNode.format;

    if (
      typeof schemaFormat === 'string' &&
      !ALLOWED_FORMATS.has(schemaFormat)
    ) {
      issues.push({
        path: `${path}/format`,
        keyword: 'format',
        message: `Format '${schemaFormat}' is not supported.`,
      });
    }

    const reference = schemaNode.$ref;

    if (
      typeof reference === 'string' &&
      !reference.startsWith('#')
    ) {
      issues.push({
        path: `${path}/$ref`,
        keyword: '$ref',
        message: 'Remote JSON Schema references are not allowed.',
      });
    }

    const properties = schemaNode.properties;

    if (properties !== undefined) {
      if (!this.isPlainObject(properties)) {
        issues.push({
          path: `${path}/properties`,
          keyword: 'properties',
          message: 'properties must be an object.',
        });
      } else {
        for (const [propertyName, childSchema] of Object.entries(
          properties,
        )) {
          if (DANGEROUS_PROPERTY_NAMES.has(propertyName)) {
            issues.push({
              path: `${path}/properties/${propertyName}`,
              keyword: 'propertyName',
              message: `Property name '${propertyName}' is not allowed.`,
            });
            continue;
          }

          if (!this.isPlainObject(childSchema)) {
            issues.push({
              path: `${path}/properties/${propertyName}`,
              keyword: 'schema',
              message: 'Every property must contain an object schema.',
            });
            continue;
          }

          this.inspectSchemaNode(
            childSchema,
            `${path}/properties/${propertyName}`,
            depth + 1,
            issues,
          );
        }
      }
    }

    const definitions = schemaNode.$defs;

    if (definitions !== undefined) {
      if (!this.isPlainObject(definitions)) {
        issues.push({
          path: `${path}/$defs`,
          keyword: '$defs',
          message: '$defs must be an object.',
        });
      } else {
        for (const [definitionName, definitionSchema] of Object.entries(
          definitions,
        )) {
          if (DANGEROUS_PROPERTY_NAMES.has(definitionName)) {
            issues.push({
              path: `${path}/$defs/${definitionName}`,
              keyword: 'definitionName',
              message: `Definition name '${definitionName}' is not allowed.`,
            });
            continue;
          }

          if (!this.isPlainObject(definitionSchema)) {
            issues.push({
              path: `${path}/$defs/${definitionName}`,
              keyword: 'schema',
              message: 'Every definition must contain an object schema.',
            });
            continue;
          }

          this.inspectSchemaNode(
            definitionSchema,
            `${path}/$defs/${definitionName}`,
            depth + 1,
            issues,
          );
        }
      }
    }

    if (this.isPlainObject(schemaNode.items)) {
      this.inspectSchemaNode(
        schemaNode.items,
        `${path}/items`,
        depth + 1,
        issues,
      );
    }
  }

  private inspectContentValue(
    value: unknown,
    path: string,
    depth: number,
    issues: ValidationIssue[],
  ): void {
    if (depth > this.maxContentDepth) {
      issues.push({
        path,
        keyword: 'maxContentDepth',
        message: `Content exceeds the maximum depth of ${this.maxContentDepth}.`,
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.inspectContentValue(
          item,
          `${path}${index}/`,
          depth + 1,
          issues,
        );
      });
      return;
    }

    if (!this.isPlainObject(value)) {
      return;
    }

    for (const [propertyName, childValue] of Object.entries(value)) {
      if (DANGEROUS_PROPERTY_NAMES.has(propertyName)) {
        issues.push({
          path: `${path}${propertyName}`,
          keyword: 'propertyName',
          message: `Property name '${propertyName}' is not allowed.`,
        });
        continue;
      }

      this.inspectContentValue(
        childValue,
        `${path}${propertyName}/`,
        depth + 1,
        issues,
      );
    }
  }

  private normalizeAjvErrors(
    errors: ErrorObject[] | null | undefined,
  ): ValidationIssue[] {
    return (errors ?? []).map((error) => ({
      path: error.instancePath || '/',
      keyword: error.keyword,
      message: error.message ?? 'Validation failed.',
    }));
  }

  private invalidSchema(
    errors: ValidationIssue[],
  ): SchemaValidationResult {
    return {
      valid: false,
      schemaHash: null,
      errors,
    };
  }

  private canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.canonicalize(item));
    }

    if (!this.isPlainObject(value)) {
      return value;
    }

    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = this.canonicalize(value[key]);
        return result;
      }, {});
  }

  private getJsonSize(value: unknown): number | null {
    try {
      const serialized = JSON.stringify(value);

      return serialized === undefined
        ? null
        : Buffer.byteLength(serialized, 'utf8');
    } catch {
      return null;
    }
  }

  private isPlainObject(
    value: unknown,
  ): value is Record<string, unknown> {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
  }

  private readPositiveInteger(
    key: string,
    fallback: number,
  ): number {
    const rawValue = this.configService.get<string | number>(key);
    const parsedValue = Number(rawValue ?? fallback);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }
}