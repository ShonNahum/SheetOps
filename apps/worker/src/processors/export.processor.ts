import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bull';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { Workbook } from '../entities/workbook.entity';
import { SheetRow } from '../entities/sheet-row.entity';
import { Job as JobEntity } from '../entities/job.entity';

@Processor('excel')
export class ExportProcessor {
  constructor(
    @InjectRepository(Workbook) private workbookRepo: Repository<Workbook>,
    @InjectRepository(SheetRow) private rowRepo: Repository<SheetRow>,
    @InjectRepository(JobEntity) private jobRepo: Repository<JobEntity>,
  ) {}

  @Process('export')
  async export(job: BullJob<{ workbookId: string; outputPath: string; jobEntityId: string }>) {
    const { workbookId, outputPath, jobEntityId } = job.data;
    
    await this.jobRepo.update(jobEntityId, { status: 'processing' });

    try {
      const workbook = await this.workbookRepo.findOne({
        where: { id: workbookId },
        relations: ['sheets'],
        order: { sheets: { sheetIndex: 'ASC' } }
      });

      if (!workbook) throw new Error('Workbook not found');

      const stream = fs.createWriteStream(outputPath);
      const xlsxWorkbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream });

      for (const sheet of workbook.sheets) {
        const worksheet = xlsxWorkbook.addWorksheet(sheet.name);
        if (sheet.headers && sheet.headers.length > 0) {
          worksheet.addRow(sheet.headers);
        }

        const PAGE = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const rows = await this.rowRepo.find({
            where: { sheetId: sheet.id },
            order: { rowIndex: 'ASC' },
            skip: page * PAGE,
            take: PAGE,
          });

          for (const row of rows) {
            worksheet.addRow(row.data);
          }
          await worksheet.commit();
          
          hasMore = rows.length === PAGE;
          page++;
          
          // Simplified progress tracking
          await job.progress(Math.min(50, page));
        }
      }
      
      await xlsxWorkbook.commit();
      
      await this.jobRepo.update(jobEntityId, { status: 'done', progress: 100, result: { path: outputPath } as any });
      await job.progress(100);

    } catch (error: any) {
      console.error('Export error:', error);
      await this.jobRepo.update(jobEntityId, { status: 'failed', error: error.message });
    }
  }
}
