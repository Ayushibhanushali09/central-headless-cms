import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { Project } from '../../projects/schemas/project.schema';

export enum PageVisibility {
  Public = 'public',
  Private = 'private',
}

export enum PageStatus {
  Active = 'active',
  Archived = 'archived',
}

@Schema({
  collection: 'pages',
  timestamps: true,
  versionKey: false,
})
export class Page {
  @Prop({
    required: true,
    trim: true,
  })
  publicId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Project.name,
    required: true,
  })
  projectId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 120,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  })
  endpointSlug!: string;

  @Prop({
    required: true,
    enum: PageVisibility,
    default: PageVisibility.Private,
  })
  visibility!: PageVisibility;

  @Prop({
    required: true,
    enum: PageStatus,
    default: PageStatus.Active,
  })
  status!: PageStatus;
}

export type PageDocument = HydratedDocument<Page>;

export const PageSchema =
  SchemaFactory.createForClass(Page);

PageSchema.index(
  { publicId: 1 },
  { unique: true },
);

PageSchema.index(
  {
    projectId: 1,
    endpointSlug: 1,
  },
  {
    unique: true,
  },
);

PageSchema.index({
  projectId: 1,
  updatedAt: -1,
});