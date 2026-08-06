import {
  Controller,
  Get,
  Header,
  Param,
} from '@nestjs/common';

import { DeliveryService } from './delivery.service';

@Controller('v1/content')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
  ) {}

  @Get(':pageId')
  @Header('Cache-Control', 'no-store')
  getPublishedContent(
    @Param('pageId') pageId: string,
  ) {
    return this.deliveryService.getPublishedContent(
      pageId,
    );
  }
}