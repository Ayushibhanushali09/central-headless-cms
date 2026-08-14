import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PagePublication,
  PagePublicationSchema,
} from '../pages/schemas/page-publication.schema';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PagePublication.name,
        schema: PagePublicationSchema,
      },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}