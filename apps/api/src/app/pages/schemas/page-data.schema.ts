import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { Page } from './page.schema';

@Schema({
  collection: 'page_documents',
  timestamps: true,
  versionKey: false,
})
export class PageData {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Page.name,
    required: true,
  })
  pageId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  schemaDefinition!: Record<string, unknown> | null;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  schemaVersion!: number;

  @Prop({
    trim: true,
    default: '',
  })
  schemaHash!: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  draftData!: Record<string, unknown> | null;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  draftVersion!: number;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  publishedData!: Record<string, unknown> | null;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  publishedVersion!: number;

  @Prop({
    type: Date,
    default: null,
  })
  publishedAt!: Date | null;
}

export type PageDataDocument =
  HydratedDocument<PageData>;

export const PageDataSchema =
  SchemaFactory.createForClass(PageData);

PageDataSchema.index(
  { pageId: 1 },
  { unique: true },
);