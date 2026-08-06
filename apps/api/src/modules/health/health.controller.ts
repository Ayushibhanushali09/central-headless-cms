import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

import { RedisService } from '../../infrastructure/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly redisService: RedisService,
  ) {}

  @Get()
  async checkHealth() {
    const mongodbConnected = this.connection.readyState === 1;

    let redisConnected = false;

    try {
      const redisResponse = await this.redisService.ping();
      redisConnected = redisResponse === 'PONG';
    } catch {
      redisConnected = false;
    }

    const allServicesHealthy =
      mongodbConnected && redisConnected;

    return {
      status: allServicesHealthy ? 'ok' : 'degraded',
      services: {
        api: 'up',
        mongodb: mongodbConnected ? 'up' : 'down',
        redis: redisConnected ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }
}