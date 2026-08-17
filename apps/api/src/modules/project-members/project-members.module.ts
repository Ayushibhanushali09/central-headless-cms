import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersModule } from '../users/users.module';
import { ProjectAuthorizationService } from './project-authorization.service';

import { ProjectMembersRepository } from './project-members.repository';
import { ProjectMembersService } from './project-members.service';

import {
  ProjectMember,
  ProjectMemberSchema,
} from './schemas/project-member.schema';

@Module({
  imports: [
    UsersModule,
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
    ProjectAuthorizationService,
  ],
  exports: [
    ProjectMembersRepository,
    ProjectMembersService,
    ProjectAuthorizationService,
  ],
})
export class ProjectMembersModule {}