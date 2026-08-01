import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SaveDraftContentDto } from './save-draft-content.dto';

describe('SaveDraftContentDto', () => {
  it('accepts an object content payload', async () => {
    const dto = plainToInstance(SaveDraftContentDto, {
      contentData: {
        hero: {
          heading: 'Welcome',
        },
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects an array content payload', async () => {
    const dto = plainToInstance(SaveDraftContentDto, {
      contentData: [],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});