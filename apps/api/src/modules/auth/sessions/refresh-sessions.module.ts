import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  RefreshSession,
  RefreshSessionSchema,
} from './schemas/refresh-session.schema';
import { RefreshSessionsRepository } from './refresh-sessions.repository';
import { RefreshSessionsService } from './refresh-sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RefreshSession.name,
        schema: RefreshSessionSchema,
      },
    ]),
  ],
  providers: [
    RefreshSessionsRepository,
    RefreshSessionsService,
  ],
  exports: [RefreshSessionsService],
})
export class RefreshSessionsModule {}