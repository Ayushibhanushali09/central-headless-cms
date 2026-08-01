import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PublishContentDto } from './publish-content.dto';

describe('PublishContentDto', () => {
  it('accepts a positive integer Draft version', async () => {
    const dto = plainToInstance(PublishContentDto, {
      expectedDraftVersion: 2,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each([0, -1, 1.5, '2', null])(
    'rejects invalid Draft version %p',
    async (expectedDraftVersion) => {
      const dto = plainToInstance(PublishContentDto, {
        expectedDraftVersion,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    },
  );
});