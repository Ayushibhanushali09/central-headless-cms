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
  PageData,
  PageDataSchema,
} from './schemas/page-data.schema';
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
        name: PageData.name,
        schema: PageDataSchema,
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