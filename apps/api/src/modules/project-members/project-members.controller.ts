import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectsService } from '../projects/projects.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectAuthorizationService } from './project-authorization.service';
import { ProjectMemberManagementService } from './project-member-management.service';
import { PROJECT_ADMIN_ROLES } from './project-permissions';

@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly authorizationService: ProjectAuthorizationService,
    private readonly managementService: ProjectMemberManagementService,
  ) {}

  @Get()
  async listMembers(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project =
      await this.projectsService.findActiveDocument(
        projectId,
      );

    await this.authorizationService.requireRoles(
      user.id,
      project._id,
      PROJECT_ADMIN_ROLES,
    );

    return this.managementService.listMembers(
      project._id,
    );
  }

  @Post()
  async addMember(
    @Param('projectId') projectId: string,
    @Body() input: AddProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project =
      await this.projectsService.findActiveDocument(
        projectId,
      );

    const actorMembership =
      await this.authorizationService.requireRoles(
        user.id,
        project._id,
        PROJECT_ADMIN_ROLES,
      );

    return this.managementService.addMember(
      project._id,
      actorMembership,
      input,
    );
  }

  @Patch(':userId')
  async updateRole(
    @Param('projectId') projectId: string,
    @Param('userId') targetUserId: string,
    @Body() input: UpdateProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project =
      await this.projectsService.findActiveDocument(
        projectId,
      );

    const actorMembership =
      await this.authorizationService.requireRoles(
        user.id,
        project._id,
        PROJECT_ADMIN_ROLES,
      );

    return this.managementService.updateRole(
      project._id,
      targetUserId,
      actorMembership,
      input,
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableMember(
    @Param('projectId') projectId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const project =
      await this.projectsService.findActiveDocument(
        projectId,
      );

    const actorMembership =
      await this.authorizationService.requireRoles(
        user.id,
        project._id,
        PROJECT_ADMIN_ROLES,
      );

    await this.managementService.disableMember(
      project._id,
      targetUserId,
      actorMembership,
    );
  }
}