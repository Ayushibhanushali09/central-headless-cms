import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PagesModule } from '../pages/pages.module';
import {
  PageData,
  PageDataSchema,
} from '../pages/schemas/page-data.schema';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    PagesModule,
    MongooseModule.forFeature([
      {
        name: PageData.name,
        schema: PageDataSchema,
      },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}