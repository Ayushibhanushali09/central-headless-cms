import {
  Logger,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>(
      'ADMIN_ORIGIN',
      'http://localhost:3000',
    ),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const managementApiPrefix = 'api/v1';

  app.setGlobalPrefix(managementApiPrefix, {
    exclude: [
      {
        path: 'v1/content/:pageId',
        method: RequestMethod.GET,
      },
    ],
  });

  const port = Number(
    configService.get<string>('PORT') ?? 4000,
  );

  await app.listen(port);

  Logger.log(
    `Management API running at http://localhost:${port}/${managementApiPrefix}`,
  );

  Logger.log(
    `Delivery API running at http://localhost:${port}/v1/content/:pageId`,
  );
}

bootstrap();