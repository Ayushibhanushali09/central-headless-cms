import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { PageVisibility } from './page.schema';

export enum PublicationStatus {
  Published = 'published',
  Archived = 'archived',
}

@Schema({
  collection: 'page_publications',
  timestamps: true,
  versionKey: false,
})
export class PagePublication {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  pageId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  pagePublicId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  projectId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PageVisibility),
  })
  visibility!: PageVisibility;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PublicationStatus),
    default: PublicationStatus.Published,
  })
  status!: PublicationStatus;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  publishedData!: Record<string, unknown>;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  publishedVersion!: number;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  publishedFromDraftVersion!: number;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  schemaHash!: string;

  @Prop({
    type: Date,
    required: true,
  })
  publishedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    default: null,
  })
  publishedBy!: Types.ObjectId | null;

  createdAt!: Date;

  updatedAt!: Date;
}

export type PagePublicationDocument =
  HydratedDocument<PagePublication>;

export const PagePublicationSchema =
  SchemaFactory.createForClass(PagePublication);

PagePublicationSchema.index(
  {
    pageId: 1,
  },
  {
    unique: true,
  },
);

PagePublicationSchema.index(
  {
    pagePublicId: 1,
  },
  {
    unique: true,
  },
);

PagePublicationSchema.index({
  projectId: 1,
  status: 1,
  publishedAt: -1,
  _id: -1,
});