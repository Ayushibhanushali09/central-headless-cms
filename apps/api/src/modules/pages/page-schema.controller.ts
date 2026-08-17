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
  PROJECT_ADMIN_ROLES,
  PROJECT_READ_ROLES,
} from '../project-members/project-permissions';
import { PageSchemaRequestDto } from './dto/page-schema-request.dto';
import { PageSchemaService } from './page-schema.service';
import { PagesService } from './pages.service';

@Controller('pages/:pageId/schema')
export class PageSchemaController {
  constructor(
    private readonly pageSchemaService: PageSchemaService,
    private readonly pagesService: PagesService,
    private readonly authorizationService: ProjectAuthorizationService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateSchema(
    @Param('pageId') pageId: string,
    @Body() requestDto: PageSchemaRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pagesService.findActiveDocument(
      pageId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      page.projectId,
      PROJECT_ADMIN_ROLES,
    );

    return this.pageSchemaService.validateForPage(
      pageId,
      requestDto,
    );
  }

  @Put()
  async saveSchema(
    @Param('pageId') pageId: string,
    @Body() requestDto: PageSchemaRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.pagesService.findActiveDocument(
      pageId,
    );

    await this.authorizationService.requireRoles(
      user.id,
      page.projectId,
      PROJECT_ADMIN_ROLES,
    );

    return this.pageSchemaService.saveSchema(
      pageId,
      requestDto,
    );
  }

  @Get()
  async getSchema(
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

    return this.pageSchemaService.getSchema(pageId);
  }
}