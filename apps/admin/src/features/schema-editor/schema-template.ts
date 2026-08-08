export const DEFAULT_PAGE_SCHEMA = JSON.stringify(
  {
    $schema:
      'https://json-schema.org/draft/2020-12/schema',
    title: 'Page Content',
    type: 'object',
    additionalProperties: false,
    required: ['hero'],
    properties: {
      hero: {
        title: 'Hero',
        type: 'object',
        additionalProperties: false,
        required: ['heading'],
        properties: {
          heading: {
            title: 'Heading',
            type: 'string',
            minLength: 1,
            maxLength: 120,
          },
          description: {
            title: 'Description',
            type: 'string',
            maxLength: 500,
            'x-cms-widget': 'textarea',
          },
          imageUrl: {
            title: 'Image URL',
            type: 'string',
            format: 'uri',
            'x-cms-widget': 'image',
          },
        },
      },
    },
  },
  null,
  2,
);