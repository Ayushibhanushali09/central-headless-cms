import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { Page } from './page.schema';

@Schema({
  collection: 'page_drafts',
  timestamps: true,
  versionKey: false,
})
export class PageDraft {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Page.name,
    required: true,
  })
  pageId!: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  schemaVersion!: number;

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
    type: Date,
    default: null,
  })
  draftUpdatedAt!: Date | null;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    default: null,
  })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PageDraftDocument =
  HydratedDocument<PageDraft>;

export const PageDraftSchema =
  SchemaFactory.createForClass(PageDraft);

PageDraftSchema.index(
  { pageId: 1 },
  { unique: true },
);