import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { ProjectMemberManagementService } from './project-member-management.service';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersModule } from './project-members.module';

@Module({
  imports: [
    ProjectsModule,
    ProjectMembersModule,
    UsersModule,
  ],
  controllers: [ProjectMembersController],
  providers: [ProjectMemberManagementService],
})
export class ProjectMemberManagementModule {}