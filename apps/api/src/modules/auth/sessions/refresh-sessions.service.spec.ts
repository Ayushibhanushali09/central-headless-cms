import {
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { RefreshSessionsRepository } from './refresh-sessions.repository';
import { RefreshSessionsService } from './refresh-sessions.service';
import type { RefreshSessionDocument } from './schemas/refresh-session.schema';

const userId = new Types.ObjectId();
const metadata = {
  userAgent: 'Playwright',
  ipAddress: '127.0.0.1',
};

describe('RefreshSessionsService', () => {
  const repository = {
    create: jest.fn(),
    findByPublicIdWithHash: jest.fn(),
    revokeIfActive: jest.fn(),
    revokeFamily: jest.fn(),
    revokeAllForUser: jest.fn(),
  } as unknown as RefreshSessionsRepository;

  let service: RefreshSessionsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new RefreshSessionsService(
      repository,
      new ConfigService({
        JWT_REFRESH_SECRET:
          'test-refresh-secret-with-at-least-32-characters',
        JWT_REFRESH_TTL_DAYS: 7,
      }),
    );
  });

  it('creates an opaque hashed refresh session', async () => {
    jest
      .spyOn(repository, 'create')
      .mockResolvedValue({} as RefreshSessionDocument);

    const result = await service.createSession(
      userId,
      metadata,
    );

    expect(result.rawToken).toMatch(/^rfs_[^.]+\..+$/);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        familyId: expect.stringMatching(/^fam_/),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      }),
    );

    const stored = jest.mocked(repository.create).mock.calls[0]?.[0];

    expect(stored?.tokenHash).not.toBe(result.rawToken);
  });

  it('rejects an unknown refresh token', async () => {
    jest
      .spyOn(repository, 'findByPublicIdWithHash')
      .mockResolvedValue(null);

    await expect(
      service.rotateSession(
        'rfs_unknown.secret',
        metadata,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('silently ignores invalid token during logout', async () => {
    await expect(
      service.revokeToken('invalid'),
    ).resolves.toBeUndefined();

    expect(
      repository.revokeIfActive,
    ).not.toHaveBeenCalled();
  });
});