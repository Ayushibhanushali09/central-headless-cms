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

import { PageSchemaRequestDto } from './dto/page-schema-request.dto';
import { PageSchemaService } from './page-schema.service';

@Controller('pages/:pageId/schema')
export class PageSchemaController {
  constructor(
    private readonly pageSchemaService: PageSchemaService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateSchema(
    @Param('pageId') pageId: string,
    @Body() requestDto: PageSchemaRequestDto,
  ) {
    return this.pageSchemaService.validateForPage(
      pageId,
      requestDto,
    );
  }

  @Put()
  saveSchema(
    @Param('pageId') pageId: string,
    @Body() requestDto: PageSchemaRequestDto,
  ) {
    return this.pageSchemaService.saveSchema(
      pageId,
      requestDto,
    );
  }

  @Get()
  getSchema(@Param('pageId') pageId: string) {
    return this.pageSchemaService.getSchema(pageId);
  }
}