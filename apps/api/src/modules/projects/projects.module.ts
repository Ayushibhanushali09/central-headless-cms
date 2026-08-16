import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersModule } from '../project-members/project-members.module';
import { UsersModule } from '../users/users.module';
import {
  Project,
  ProjectSchema,

} from './schemas/project.schema';

@Module({
  imports: [
    ProjectMembersModule,
    UsersModule,
    MongooseModule.forFeature([
      {
        name: Project.name,
        schema: ProjectSchema,
      },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}