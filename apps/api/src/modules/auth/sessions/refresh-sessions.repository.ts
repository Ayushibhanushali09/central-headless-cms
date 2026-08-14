import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Model,
  Types,
} from 'mongoose';

import {
  RefreshSession,
  type RefreshSessionDocument,
} from './schemas/refresh-session.schema';

export interface CreateRefreshSessionRecord {
  publicId: string;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

@Injectable()
export class RefreshSessionsRepository {
  constructor(
    @InjectModel(RefreshSession.name)
    private readonly model: Model<RefreshSessionDocument>,
  ) {}

  create(
    input: CreateRefreshSessionRecord,
  ): Promise<RefreshSessionDocument> {
    return this.model.create(input);
  }

  findByPublicIdWithHash(
    publicId: string,
  ): Promise<RefreshSessionDocument | null> {
    return this.model
      .findOne({ publicId })
      .select('+tokenHash')
      .exec();
  }

  async revokeIfActive(
    publicId: string,
    replacedByPublicId: string | null,
  ): Promise<boolean> {
    const result = await this.model
      .updateOne(
        {
          publicId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            replacedByPublicId,
            lastUsedAt: new Date(),
          },
        },
      )
      .exec();

    return result.modifiedCount === 1;
  }

  async revokeFamily(
    familyId: string,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        {
          familyId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
      )
      .exec();

    return result.modifiedCount;
  }

  async revokeAllForUser(
    userId: Types.ObjectId,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        {
          userId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
      )
      .exec();

    return result.modifiedCount;
  }
}