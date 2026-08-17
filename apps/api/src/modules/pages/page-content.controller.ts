import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAuthorizationService } from '../project-members/project-authorization.service';
import {
  PROJECT_DRAFT_WRITE_ROLES,
  PROJECT_PUBLISH_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import { SaveDraftContentDto } from './dto/save-draft-content.dto';
import { PublishContentDto } from './dto/publish-content.dto';
import { PageContentService } from './page-content.service';
import { PagesService } from './pages.service';

@Controller('pages/:pageId/content')
export class PageContentController {
  constructor(
    private readonly pageContentService: PageContentService,
    private readonly pagesService: PagesService,
    private readonly authorizationService: ProjectAuthorizationService,
  ) {}

  @Get()
  async getContent(
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

    return this.pageContentService.getContent(pageId);
  }

  @Put('draft')
  async saveDraft(
    @Param('pageId') pageId: string,
    @Body() requestDto: SaveDraftContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pagesService.findActiveDocument(
      pageId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      page.projectId,
      PROJECT_DRAFT_WRITE_ROLES,
    );

    return this.pageContentService.saveDraft(
      pageId,
      requestDto,
    );
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('pageId') pageId: string,
    @Body() requestDto: PublishContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pagesService.findActiveDocument(
      pageId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      page.projectId,
      PROJECT_PUBLISH_ROLES,
    );

    return this.pageContentService.publish(
      pageId,
      requestDto,
    );
  }
}