import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  it('trims valid name and description', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: '  Demo Website  ',
      description: '  Test project  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Demo Website');
    expect(dto.description).toBe('Test project');
  });

  it('rejects a whitespace-only name', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      name: '   ',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});