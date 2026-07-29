import { Module } from '@nestjs/common';

import { SchemaEngineService } from './schema-engine.service';

@Module({
  providers: [SchemaEngineService],
  exports: [SchemaEngineService],
})
export class SchemaEngineModule {}