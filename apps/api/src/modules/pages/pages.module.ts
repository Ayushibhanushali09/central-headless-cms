import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProjectsModule } from '../projects/projects.module';
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { PageContentController } from './page-content.controller';
import { PageContentService } from './page-content.service';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import {
  PageDraft,
  PageDraftSchema,
} from './schemas/page-draft.schema';
import {
  PagePublication,
  PagePublicationSchema,
} from './schemas/page-publication.schema';
import {
  PageSchemaRecord,
  PageSchemaRecordSchema,
} from './schemas/page-schema-record.schema';
import {
  Page,
  PageSchema,
} from './schemas/page.schema';

@Module({
  imports: [
    ProjectsModule,
    SchemaEngineModule,

    MongooseModule.forFeature([
      {
        name: Page.name,
        schema: PageSchema,
      },
      {
        name: PageSchemaRecord.name,
        schema: PageSchemaRecordSchema,
      },
      {
        name: PageDraft.name,
        schema: PageDraftSchema,
      },
      {
        name: PagePublication.name,
        schema: PagePublicationSchema,
      },
    ]),
  ],

  controllers: [
    PagesController,
    PageSchemaController,
    PageContentController,
  ],

  providers: [
    PagesService,
    PageSchemaService,
    PageContentService,
  ],

  exports: [
    PagesService,
    PageSchemaService,
    PageContentService,
  ],
})
export class PagesModule {}