import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsGateway } from './jobs.gateway';
import { JobsRedisListenerService } from './jobs-redis-listener.service';
import { Job } from '../entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobsService, JobsGateway, JobsRedisListenerService],
  exports: [JobsService, JobsGateway],
})
export class JobsModule {}
