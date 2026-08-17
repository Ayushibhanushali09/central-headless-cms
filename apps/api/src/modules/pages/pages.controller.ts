import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAuthorizationService } from '../project-members/project-authorization.service';
import {
  PROJECT_ADMIN_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import { ProjectsService } from '../projects/projects.service';
import { CreatePageDto } from './dto/create-page.dto';
import { PagesService } from './pages.service';

@Controller()
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly projectsService: ProjectsService,
    private readonly authorizationService: ProjectAuthorizationService,
  ) {}

  @Post('projects/:projectId/pages')
  async create(
    @Param('projectId') projectId: string,
    @Body() createPageDto: CreatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.projectsService.findActiveDocument(
      projectId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      project._id,
      PROJECT_ADMIN_ROLES,
    );

    return this.pagesService.create(
      projectId,
      createPageDto,
    );
  }

  @Get('projects/:projectId/pages')
  async findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const project = await this.projectsService.findActiveDocument(
      projectId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      project._id,
      PROJECT_READ_ROLES,
    );

    return this.pagesService.findAll(projectId);
  }

  @Get('pages/:pageId')
  async findOne(
    @Param('pageId') pageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pagesService.findActiveDocument(
      pageId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      page.projectId,
      PROJECT_READ_ROLES,
    );

    return this.pagesService.findOne(pageId);
  }
}