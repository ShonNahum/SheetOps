import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Workbook } from '../entities/workbook.entity';
import { Job } from '../entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workbook, Job]),
    BullModule.registerQueue({
      name: 'excel',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
