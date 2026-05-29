import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ExcelProcessor } from './excel.processor';
import { ExportProcessor } from './export.processor';
import { Workbook } from '../entities/workbook.entity';
import { Sheet } from '../entities/sheet.entity';
import { SheetRow } from '../entities/sheet-row.entity';
import { Job } from '../entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workbook, Sheet, SheetRow, Job]),
    BullModule.registerQueue({
      name: 'excel',
    }),
  ],
  providers: [ExcelProcessor, ExportProcessor],
})
export class ProcessorsModule {}
