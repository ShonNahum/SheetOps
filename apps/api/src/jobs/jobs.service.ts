import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}

  async findOne(id: string) {
    return this.jobRepo.findOne({ where: { id } });
  }

  async updateProgress(id: string, progress: number) {
    await this.jobRepo.update(id, { progress, status: progress === 100 ? 'done' : 'processing' });
  }

  async markDone(id: string, result?: any) {
    await this.jobRepo.update(id, { status: 'done', progress: 100, result });
  }

  async markFailed(id: string, error: string) {
    await this.jobRepo.update(id, { status: 'failed', error });
  }
}
