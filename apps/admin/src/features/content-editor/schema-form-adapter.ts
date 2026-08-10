import type {
  RJSFSchema,
  UiSchema,
} from '@rjsf/utils';

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<
    Record<string, unknown>
  >((result, [key, childValue]) => {
    if (key === '$schema' || key === 'x-cms-widget') {
      return result;
    }

    result[key] = sanitizeValue(childValue);
    return result;
  }, {});
}

function buildUiSchemaNode(
  schema: Record<string, unknown>,
): UiSchema {
  const uiSchema: UiSchema = {};
  const widget = schema['x-cms-widget'];

  if (widget === 'textarea') {
    uiSchema['ui:widget'] = 'textarea';
    uiSchema['ui:options'] = {
      rows: 5,
    };
  }

  if (widget === 'image') {
    uiSchema['ui:widget'] = 'ImageUrlWidget';
  }

  const properties = schema.properties;

  if (isRecord(properties)) {
    for (const [propertyName, childSchema] of Object.entries(
      properties,
    )) {
      if (isRecord(childSchema)) {
        uiSchema[propertyName] =
          buildUiSchemaNode(childSchema);
      }
    }
  }

  const items = schema.items;

  if (isRecord(items)) {
    uiSchema.items = buildUiSchemaNode(items);
  }

  return uiSchema;
}

export function prepareSchemaForForm(
  schema: Record<string, unknown>,
): RJSFSchema {
  return sanitizeValue(schema) as RJSFSchema;
}

export function createUiSchema(
  schema: Record<string, unknown>,
): UiSchema {
  return buildUiSchemaNode(schema);
}