import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Project,
  ProjectSchema,
} from './schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Project.name,
        schema: ProjectSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class ProjectsModule {}