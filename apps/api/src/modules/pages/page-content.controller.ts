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

import { PublishContentDto } from './dto/publish-content.dto';
import { SaveDraftContentDto } from './dto/save-draft-content.dto';
import { PageContentService } from './page-content.service';

@Controller('pages/:pageId/content')
export class PageContentController {
  constructor(
    private readonly pageContentService: PageContentService,
  ) {}

  @Get()
  getContent(@Param('pageId') pageId: string) {
    return this.pageContentService.getContent(pageId);
  }

  @Put('draft')
  saveDraft(
    @Param('pageId') pageId: string,
    @Body() requestDto: SaveDraftContentDto,
  ) {
    return this.pageContentService.saveDraft(
      pageId,
      requestDto,
    );
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('pageId') pageId: string,
    @Body() requestDto: PublishContentDto,
  ) {
    return this.pageContentService.publish(
      pageId,
      requestDto,
    );
  }
}