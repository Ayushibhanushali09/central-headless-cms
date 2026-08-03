import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { RedisModule } from './redis/redis.module';
import { PagesModule } from './pages/pages.module';
import { ProjectsModule } from './projects/projects.module';
import { SchemaEngineModule } from './schema-engine/schema-engine.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    RedisModule,
    SchemaEngineModule,
    ProjectsModule,
    PagesModule,
    DeliveryModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}