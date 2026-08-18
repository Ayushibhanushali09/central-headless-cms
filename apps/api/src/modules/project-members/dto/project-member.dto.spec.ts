import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AddProjectMemberDto } from './add-project-member.dto';
import { UpdateProjectMemberDto } from './update-project-member.dto';

async function errorsFor<T extends object>(
  type: new () => T,
  input: Record<string, unknown>,
) {
  return validate(plainToInstance(type, input));
}

describe('Project member DTOs', () => {
  it('normalizes a valid add-member request', async () => {
    const dto = plainToInstance(
      AddProjectMemberDto,
      {
        email: '  MEMBER@EXAMPLE.COM  ',
        role: 'viewer',
      },
    );

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('member@example.com');
  });

  it('rejects Owner assignment', async () => {
    const errors = await errorsFor(
      AddProjectMemberDto,
      {
        email: 'member@example.com',
        role: 'owner',
      },
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown role update', async () => {
    const errors = await errorsFor(
      UpdateProjectMemberDto,
      {
        role: 'super-admin',
      },
    );

    expect(errors.length).toBeGreaterThan(0);
  });
});