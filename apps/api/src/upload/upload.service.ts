import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Workbook } from '../entities/workbook.entity';
import { Job as JobEntity } from '../entities/job.entity';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Workbook)
    private workbookRepo: Repository<Workbook>,
    @InjectRepository(JobEntity)
    private jobRepo: Repository<JobEntity>,
    @InjectQueue('excel') private excelQueue: Queue,
  ) {}

  private normalizeFilename(filename: string) {
    if (!filename) return filename;
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    if (decoded.includes('�')) {
      return filename;
    }
    if (Buffer.from(decoded, 'utf8').toString('latin1') === filename) {
      return decoded;
    }
    return filename;
  }

  async createWorkbook(file: Express.Multer.File): Promise<Workbook> {
    const normalizedName = this.normalizeFilename(file.originalname);
    const workbook = this.workbookRepo.create({
      name: normalizedName.replace(/\.[^/.]+$/, ''),
      originalFilename: normalizedName,
      fileSize: file.size,
      filePath: file.path,
      status: 'pending',
    });
    return await this.workbookRepo.save(workbook) as Workbook;
  }

  async enqueueParseJob(workbookId: string, filePath: string): Promise<JobEntity> {
    const jobEntity = this.jobRepo.create({
      workbookId,
      type: 'upload',
      status: 'queued',
      progress: 0,
    });
    const savedJob = await this.jobRepo.save(jobEntity);

    await this.excelQueue.add(
      'parse',
      { workbookId, filePath, jobEntityId: savedJob.id },
      { jobId: savedJob.id }
    );

    return savedJob;
  }
}
