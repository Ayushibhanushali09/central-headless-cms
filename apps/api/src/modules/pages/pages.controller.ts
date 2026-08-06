import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { CreatePageDto } from './dto/create-page.dto';
import { PagesService } from './pages.service';

@Controller()
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
  ) {}

  @Post('projects/:projectId/pages')
  create(
    @Param('projectId') projectId: string,
    @Body() createPageDto: CreatePageDto,
  ) {
    return this.pagesService.create(
      projectId,
      createPageDto,
    );
  }

  @Get('projects/:projectId/pages')
  findAll(
    @Param('projectId') projectId: string,
  ) {
    return this.pagesService.findAll(projectId);
  }

  @Get('pages/:pageId')
  findOne(@Param('pageId') pageId: string) {
    return this.pagesService.findOne(pageId);
  }
}