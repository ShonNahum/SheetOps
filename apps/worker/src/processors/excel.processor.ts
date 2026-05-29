import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job as BullJob } from 'bull';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as readline from 'readline';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Workbook } from '../entities/workbook.entity';
import { Sheet } from '../entities/sheet.entity';
import { Job as JobEntity } from '../entities/job.entity';

@Processor('excel')
export class ExcelProcessor {
  private redisPublisher!: Redis;

  constructor(
    @InjectRepository(Workbook) private workbookRepo: Repository<Workbook>,
    @InjectRepository(Sheet) private sheetRepo: Repository<Sheet>,
    @InjectRepository(JobEntity) private jobRepo: Repository<JobEntity>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    const redisConfig = {
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      password: this.configService.get<string>('redis.password'),
    };

    this.redisPublisher = new Redis(redisConfig);
  }

  private async publishJobEvent(event: string, data: any) {
    if (this.redisPublisher) {
      try {
        await this.redisPublisher.publish(`job:${event}`, JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to publish ${event} event:`, error);
      }
    }
  }

  @Process('parse')
  async parse(job: BullJob<{ workbookId: string; filePath: string; jobEntityId: string }>) {
    const { workbookId, filePath, jobEntityId } = job.data;

    await this.workbookRepo.update(workbookId, { status: 'processing' });
    await this.jobRepo.update(jobEntityId, { status: 'processing' });

    try {
      if (filePath.toLowerCase().endsWith('.csv')) {
        await this.parseCsv(job, workbookId, filePath);
      } else if (filePath.toLowerCase().endsWith('.xls')) {
        await this.parseXls(job, workbookId, filePath);
      } else {
        await this.parseExcel(job, workbookId, filePath);
      }

      await this.workbookRepo.update(workbookId, { status: 'ready' });
      await this.jobRepo.update(jobEntityId, { status: 'done', progress: 100 });
      await job.progress(100);

      // Publish completion event to Redis for API to broadcast
      await this.publishJobEvent('done', { jobId: jobEntityId, workbookId });
    } catch (error: any) {
      console.error('Parse error:', error);
      await this.workbookRepo.update(workbookId, { status: 'error', errorMessage: error.message });
      await this.jobRepo.update(jobEntityId, { status: 'failed', error: error.message });
      
      // Publish error event to Redis for API to broadcast
      await this.publishJobEvent('error', { jobId: jobEntityId, workbookId, error: error.message });
    }
  }

  private async parseExcel(job: BullJob, workbookId: string, filePath: string) {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      worksheets: 'emit',
      entries: 'emit',
    });

    let sheetIndex = 0;

    for await (const worksheet of workbookReader) {
      const sheet = this.sheetRepo.create({
        workbookId,
        name: (worksheet as any).name || `Sheet${sheetIndex + 1}`,
        sheetIndex: sheetIndex++,
      });
      const sheetEntity = await this.sheetRepo.save(sheet);

      const BATCH_SIZE = 500;
      let batch: { rowIndex: number; data: unknown[] }[] = [];
      let rowIndex = 0;
      let headers: string[] = [];

      for await (const row of worksheet) {
        const rawValues: any = row.values || [];
        const valuesArray = Array.isArray(rawValues) ? rawValues : Object.values(rawValues);
        const rowData = valuesArray.slice(1); // 1-indexed

        if (rowIndex === 0) {
          headers = rowData.map(String);
          await this.sheetRepo.update(sheetEntity.id, { headers });
        }

        batch.push({ rowIndex, data: rowData });
        rowIndex++;

        if (batch.length >= BATCH_SIZE) {
          await this.upsertRows(sheetEntity.id, batch);
          batch = [];
          
          const progress = Math.min(Math.floor((rowIndex / ((worksheet as any).rowCount || 1)) * 100), 99);
          await job.progress(progress);
          await this.jobRepo.update(job.data.jobEntityId, { progress });

          // Publish progress event to Redis
          await this.publishJobEvent('progress', { 
            jobId: job.data.jobEntityId, 
            workbookId, 
            progress 
          });
        }
      }

      if (batch.length) {
        await this.upsertRows(sheetEntity.id, batch);
      }

      await this.sheetRepo.update(sheetEntity.id, { rowCount: rowIndex, colCount: headers.length });
    }
  }

  private async parseXls(job: BullJob, workbookId: string, filePath: string) {
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
    const sheetNames = workbook.SheetNames || [];

    let sheetIndex = 0;
    for (const sheetName of sheetNames) {
      const sheet = this.sheetRepo.create({
        workbookId,
        name: sheetName || `Sheet${sheetIndex + 1}`,
        sheetIndex: sheetIndex++,
      });
      const sheetEntity = await this.sheetRepo.save(sheet);

      const sheetData = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: '',
      });

      const BATCH_SIZE = 500;
      let batch: { rowIndex: number; data: unknown[] }[] = [];
      let rowIndex = 0;
      let headers: string[] = [];
      const totalRows = sheetData.length || 1;

      for (const rowData of sheetData) {
        const dataArray = Array.isArray(rowData) ? rowData : [];

        if (rowIndex === 0) {
          headers = dataArray.map(String);
          await this.sheetRepo.update(sheetEntity.id, { headers });
        }

        batch.push({ rowIndex, data: dataArray });
        rowIndex++;

        if (batch.length >= BATCH_SIZE) {
          await this.upsertRows(sheetEntity.id, batch);
          batch = [];

          const progress = Math.min(Math.floor((rowIndex / totalRows) * 100), 99);
          await job.progress(progress);
          await this.jobRepo.update(job.data.jobEntityId, { progress });
          await this.publishJobEvent('progress', {
            jobId: job.data.jobEntityId,
            workbookId,
            progress,
          });
        }
      }

      if (batch.length) {
        await this.upsertRows(sheetEntity.id, batch);
      }

      await this.sheetRepo.update(sheetEntity.id, { rowCount: rowIndex, colCount: headers.length });
    }
  }

  private async parseCsv(job: BullJob, workbookId: string, filePath: string) {
    const sheet = this.sheetRepo.create({
      workbookId,
      name: 'Data',
      sheetIndex: 0,
    });
    const sheetEntity = await this.sheetRepo.save(sheet);

    const BATCH_SIZE = 500;
    let batch: { rowIndex: number; data: unknown[] }[] = [];
    let rowIndex = 0;
    let headers: string[] = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const rowData = line.split(',').map(v => v.trim()); // Simple split, a real app would use a proper CSV parser

      if (rowIndex === 0) {
        headers = rowData;
        await this.sheetRepo.update(sheetEntity.id, { headers });
      }

      batch.push({ rowIndex, data: rowData });
      rowIndex++;

      if (batch.length >= BATCH_SIZE) {
        await this.upsertRows(sheetEntity.id, batch);
        batch = [];

        const progress = Math.min(Math.floor((rowIndex / 10000) * 100), 99);
        await job.progress(progress);
        await this.jobRepo.update(job.data.jobEntityId, { progress });

        // Publish progress event to Redis
        await this.publishJobEvent('progress', { 
          jobId: job.data.jobEntityId, 
          workbookId, 
          progress 
        });
      }
    }

    if (batch.length) {
      await this.upsertRows(sheetEntity.id, batch);
    }

    await this.sheetRepo.update(sheetEntity.id, { rowCount: rowIndex, colCount: headers.length });
  }

  private async upsertRows(sheetId: string, rows: { rowIndex: number; data: unknown[] }[]) {
    if (rows.length === 0) return;
    const values = rows.map(r => `('${sheetId}', ${r.rowIndex}, '${JSON.stringify(r.data).replace(/'/g, "''")}'::jsonb, NOW())`);
    await this.dataSource.query(`
      INSERT INTO sheet_rows (sheet_id, row_index, data, updated_at)
      VALUES ${values.join(',')}
      ON CONFLICT (sheet_id, row_index) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `);
  }
}
