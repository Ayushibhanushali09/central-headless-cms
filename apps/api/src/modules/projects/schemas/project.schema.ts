import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';


export enum ProjectStatus {
  Active = 'active',
  Archived = 'archived',
}

@Schema({
  collection: 'projects',
  timestamps: true,
  versionKey: false,
})
export class Project {
  @Prop({
    required: true,
    trim: true,
  })
  publicId!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 120,
  })
  name!: string;

  @Prop({
    trim: true,
    maxlength: 500,
    default: '',
  })
  description!: string;

    @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  createdBy!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ProjectStatus,
    default: ProjectStatus.Active,
  })
  status!: ProjectStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectDocument = HydratedDocument<Project>;

export const ProjectSchema =
  SchemaFactory.createForClass(Project);

ProjectSchema.index(
  { publicId: 1 },
  { unique: true },
);

ProjectSchema.index({
  status: 1,
  updatedAt: -1,
});