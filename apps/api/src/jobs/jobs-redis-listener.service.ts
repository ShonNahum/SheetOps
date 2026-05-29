import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { JobsGateway } from './jobs.gateway';

@Injectable()
export class JobsRedisListenerService implements OnModuleInit, OnModuleDestroy {
  private redisSubscriber: Redis;

  constructor(
    private configService: ConfigService,
    private jobsGateway: JobsGateway,
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisConfig = {
      host: this.configService.get<string>('database.redis.host') || 'localhost',
      port: this.configService.get<number>('database.redis.port') || 6379,
      password: this.configService.get<string>('database.redis.password'),
    };

    this.redisSubscriber = new Redis(redisConfig);
  }

  async onModuleInit() {
    try {
      // Subscribe to job events from the worker
      this.redisSubscriber.on('message', (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          
          if (channel === 'job:progress') {
            this.jobsGateway.emitJobProgress(data.jobId, data.progress, 'processing');
          } else if (channel === 'job:done') {
            this.jobsGateway.emitJobDone(data.jobId, data.workbookId);
          } else if (channel === 'job:error') {
            this.jobsGateway.emitJobError(data.jobId, data.error || 'Unknown error occurred');
          }
        } catch (error) {
          console.error(`Error processing ${channel} event:`, error);
        }
      });

      await this.redisSubscriber.subscribe('job:progress', 'job:done', 'job:error');

      console.log('JobsRedisListenerService: Connected and listening to job events');
    } catch (error) {
      console.error('Failed to initialize JobsRedisListenerService:', error);
    }
  }

  async onModuleDestroy() {
    if (this.redisSubscriber) {
      await this.redisSubscriber.disconnect();
    }
  }
}
