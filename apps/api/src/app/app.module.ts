import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { RedisModule } from '../infrastructure/redis/redis.module';
import { DeliveryModule } from '../modules/delivery/delivery.module';
import { HealthModule } from '../modules/health/health.module';
import { PagesModule } from '../modules/pages/pages.module';
import { ProjectsModule } from '../modules/projects/projects.module';
import { SchemaEngineModule } from '../modules/schema-engine/schema-engine.module';
import { envValidationSchema } from '../config/env.validation';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
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
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
