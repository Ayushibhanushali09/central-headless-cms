import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export enum UserStatus {
  Active = 'active',
  Disabled = 'disabled',
}

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  publicId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.Active,
  })
  status!: UserStatus;

  @Prop({
    type: Date,
    default: null,
  })
  emailVerifiedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema =
  SchemaFactory.createForClass(User);

UserSchema.index(
  { publicId: 1 },
  { unique: true },
);

UserSchema.index(
  { email: 1 },
  { unique: true },
);

UserSchema.index({
  status: 1,
  createdAt: -1,
});