import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { Types } from 'mongoose';
import { ulid } from 'ulid';

import type {
  CreatedRefreshSession,
  RotatedRefreshSession,
  SessionMetadata,
} from './refresh-session.types';
import { RefreshSessionsRepository } from './refresh-sessions.repository';

@Injectable()
export class RefreshSessionsService {
  private readonly secret: string;
  private readonly ttlDays: number;

  constructor(
    private readonly repository: RefreshSessionsRepository,
    configService: ConfigService,
  ) {
    this.secret =
      configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      );

    this.ttlDays = Number(
      configService.getOrThrow<number>(
        'JWT_REFRESH_TTL_DAYS',
      ),
    );
  }

  async createSession(
    userId: Types.ObjectId,
    metadata: SessionMetadata,
    familyId = `fam_${ulid()}`,
    publicId = `rfs_${ulid()}`,
  ): Promise<CreatedRefreshSession> {
    const secretPart = randomBytes(32).toString(
      'base64url',
    );
    const rawToken = `${publicId}.${secretPart}`;
    const expiresAt = new Date(
      Date.now() +
        this.ttlDays * 24 * 60 * 60 * 1000,
    );

    await this.repository.create({
      publicId,
      userId,
      familyId,
      tokenHash: this.hashToken(rawToken),
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    return {
      rawToken,
      publicId,
      familyId,
      userId,
      expiresAt,
    };
  }

  async rotateSession(
    rawToken: string,
    metadata: SessionMetadata,
  ): Promise<RotatedRefreshSession> {
    const publicId = this.parsePublicId(rawToken);

    const current =
      await this.repository.findByPublicIdWithHash(
        publicId,
      );

    if (!current || !current.tokenHash) {
      throw this.invalidRefreshToken();
    }

    if (!this.tokenMatches(rawToken, current.tokenHash)) {
      await this.repository.revokeFamily(
        current.familyId,
      );
      throw this.invalidRefreshToken();
    }

    if (
      current.revokedAt !== null ||
      current.expiresAt.getTime() <= Date.now()
    ) {
      await this.repository.revokeFamily(
        current.familyId,
      );
      throw this.invalidRefreshToken();
    }

    const nextPublicId = `rfs_${ulid()}`;
    const revoked = await this.repository.revokeIfActive(
      current.publicId,
      nextPublicId,
    );

    if (!revoked) {
      await this.repository.revokeFamily(
        current.familyId,
      );
      throw this.invalidRefreshToken();
    }

    const next = await this.createSession(
      current.userId,
      metadata,
      current.familyId,
      nextPublicId,
    );

    return {
      rawToken: next.rawToken,
      userId: next.userId,
      expiresAt: next.expiresAt,
    };
  }

  async revokeToken(rawToken: string): Promise<void> {
    let publicId: string;

    try {
      publicId = this.parsePublicId(rawToken);
    } catch {
      return;
    }

    const session =
      await this.repository.findByPublicIdWithHash(
        publicId,
      );

    if (
      !session ||
      !session.tokenHash ||
      !this.tokenMatches(rawToken, session.tokenHash)
    ) {
      return;
    }

    await this.repository.revokeIfActive(
      session.publicId,
      null,
    );
  }

  revokeAllForUser(
    userId: Types.ObjectId,
  ): Promise<number> {
    return this.repository.revokeAllForUser(userId);
  }

  private parsePublicId(rawToken: string): string {
    const separatorIndex = rawToken.indexOf('.');

    if (separatorIndex <= 0) {
      throw this.invalidRefreshToken();
    }

    const publicId = rawToken.slice(0, separatorIndex);

    if (!publicId.startsWith('rfs_')) {
      throw this.invalidRefreshToken();
    }

    return publicId;
  }

  private hashToken(rawToken: string): string {
    return createHmac('sha256', this.secret)
      .update(rawToken)
      .digest('hex');
  }

  private tokenMatches(
    rawToken: string,
    expectedHash: string,
  ): boolean {
    const actualBuffer = Buffer.from(
      this.hashToken(rawToken),
      'hex',
    );
    const expectedBuffer = Buffer.from(
      expectedHash,
      'hex',
    );

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh session is invalid or expired.',
    });
  }
}