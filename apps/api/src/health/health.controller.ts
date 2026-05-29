import { Controller, Get, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../shared/redis.module';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private dataSource: DataSource,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
  ) {}

  @Get()
  getHealth() {
    return { status: 'ok' };
  }

  @Get('ready')
  async checkReady() {
    try {
      await this.dataSource.query('SELECT 1');
      await this.redisClient.ping();
      return { status: 'ok', timestamp: new Date() };
    } catch (error) {
      throw new Error('Service not ready');
    }
  }
}
