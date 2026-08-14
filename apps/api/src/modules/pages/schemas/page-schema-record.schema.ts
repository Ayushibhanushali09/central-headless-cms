import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { Page } from './page.schema';

@Schema({
  collection: 'page_schemas',
  timestamps: true,
  versionKey: false,
})
export class PageSchemaRecord {
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
    type: MongooseSchema.Types.ObjectId,
    default: null,
  })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PageSchemaRecordDocument =
  HydratedDocument<PageSchemaRecord>;

export const PageSchemaRecordSchema =
  SchemaFactory.createForClass(PageSchemaRecord);

PageSchemaRecordSchema.index(
  { pageId: 1 },
  { unique: true },
);