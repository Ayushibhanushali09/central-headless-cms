import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePageDto } from './create-page.dto';
import { PageVisibility } from '../schemas/page.schema';

describe('CreatePageDto', () => {
  it('trims the name and normalizes the endpoint slug', async () => {
    const dto = plainToInstance(CreatePageDto, {
      name: '  Home Page  ',
      endpointSlug: '  Home-Page  ',
      visibility: PageVisibility.Public,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Home Page');
    expect(dto.endpointSlug).toBe('home-page');
  });

  it('rejects an invalid endpoint slug', async () => {
    const dto = plainToInstance(CreatePageDto, {
      name: 'Home Page',
      endpointSlug: 'home page!',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});