import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('normalizes valid registration input', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: '  Ayushi  ',
      email: '  USER@EXAMPLE.COM  ',
      password: 'SecurePass123',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Ayushi');
    expect(dto.email).toBe('user@example.com');
  });

  it('rejects a weak password', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Ayushi',
      email: 'user@example.com',
      password: 'weak',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});