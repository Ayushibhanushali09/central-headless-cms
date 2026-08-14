import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('normalizes valid login email', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  USER@EXAMPLE.COM  ',
      password: 'SecurePass123',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('rejects invalid credentials shape', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'invalid-email',
      password: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});