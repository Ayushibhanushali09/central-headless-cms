import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProjectMembersRepository } from './project-members.repository';
import { ProjectMembersService } from './project-members.service';
import {
  ProjectMember,
  ProjectMemberSchema,
} from './schemas/project-member.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProjectMember.name,
        schema: ProjectMemberSchema,
      },
    ]),
  ],
  providers: [
    ProjectMembersRepository,
    ProjectMembersService,
  ],
  exports: [
    ProjectMembersRepository,
    ProjectMembersService,
  ],
})
export class ProjectMembersModule {}