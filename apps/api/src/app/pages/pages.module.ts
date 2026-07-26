import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProjectsModule } from '../projects/projects.module';
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
  exports: [MongooseModule],
})
export class PagesModule {}