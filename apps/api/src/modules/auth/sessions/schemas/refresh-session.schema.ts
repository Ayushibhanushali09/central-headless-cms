import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { User } from '../../../users/schemas/user.schema';

@Schema({
  collection: 'refresh_sessions',
  timestamps: true,
  versionKey: false,
})
export class RefreshSession {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  publicId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  familyId!: string;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  tokenHash!: string;

  @Prop({
    type: Date,
    required: true,
  })
  expiresAt!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  revokedAt!: Date | null;

  @Prop({
    type: String,
    default: null,
  })
  replacedByPublicId!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  lastUsedAt!: Date | null;

  @Prop({
    type: String,
    default: null,
    maxlength: 500,
  })
  userAgent!: string | null;

  @Prop({
    type: String,
    default: null,
    maxlength: 100,
  })
  ipAddress!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type RefreshSessionDocument =
  HydratedDocument<RefreshSession>;

export const RefreshSessionSchema =
  SchemaFactory.createForClass(RefreshSession);

RefreshSessionSchema.index(
  { publicId: 1 },
  { unique: true },
);

RefreshSessionSchema.index({
  userId: 1,
  revokedAt: 1,
});

RefreshSessionSchema.index({
  familyId: 1,
  revokedAt: 1,
});

RefreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);