import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sheet } from '../entities/sheet.entity';
import { SheetRow } from '../entities/sheet-row.entity';
import { Workbook } from '../entities/workbook.entity';

@Injectable()
export class SheetsService {
  constructor(
    @InjectRepository(Sheet) private sheetRepo: Repository<Sheet>,
    @InjectRepository(SheetRow) private rowRepo: Repository<SheetRow>,
    @InjectRepository(Workbook) private workbookRepo: Repository<Workbook>,
    private dataSource: DataSource,
  ) {}

  async findByWorkbook(workbookId: string) {
    return this.sheetRepo.find({ where: { workbookId }, order: { sheetIndex: 'ASC' } });
  }

  async getRows(sheetId: string, page: number, pageSize: number) {
    const sheet = await this.sheetRepo.findOne({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Sheet not found');

    const [rows, total] = await this.rowRepo.findAndCount({
      where: { sheetId },
      order: { rowIndex: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      headers: sheet.headers,
      rows: rows.map(r => ({ rowIndex: r.rowIndex, data: r.data })),
      total,
      page,
      pageSize,
    };
  }

  async getRow(sheetId: string, rowIndex: number) {
    const row = await this.rowRepo.findOne({ where: { sheetId, rowIndex } });
    if (!row) throw new NotFoundException('Row not found');
    return { rowIndex: row.rowIndex, data: row.data };
  }

  async getCell(sheetId: string, rowIndex: number, colIndex: number) {
    const row = await this.rowRepo.findOne({ where: { sheetId, rowIndex } });
    if (!row) throw new NotFoundException('Row not found');
    return { rowIndex: row.rowIndex, colIndex, value: row.data[colIndex] ?? null };
  }

  async getColumn(sheetId: string, colIndex: number) {
    const rows = await this.rowRepo.find({
      where: { sheetId },
      order: { rowIndex: 'ASC' },
    });
    return {
      colIndex,
      values: rows.map(r => ({ rowIndex: r.rowIndex, value: r.data[colIndex] ?? null })),
    };
  }

  async createSheet(workbookId: string, name: string, sheetIndex: number): Promise<Sheet> {
    const sheet = this.sheetRepo.create({ workbookId, name, sheetIndex });
    return await this.sheetRepo.save(sheet);
  }

  async upsertRows(sheetId: string, rows: { rowIndex: number; data: unknown[] }[]) {
    if (rows.length === 0) return;
    
    // PostgreSQL bulk upsert
    const values = rows.map(r => `('${sheetId}', ${r.rowIndex}, '${JSON.stringify(r.data).replace(/'/g, "''")}'::jsonb, NOW())`);
    await this.dataSource.query(`
      INSERT INTO sheet_rows (sheet_id, row_index, data, updated_at)
      VALUES ${values.join(',')}
      ON CONFLICT (sheet_id, row_index) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `);
  }

  async getRowsBatch(sheetId: string, skip: number, take: number) {
    return this.rowRepo.find({
      where: { sheetId },
      order: { rowIndex: 'ASC' },
      skip,
      take,
    });
  }

  async updateCells(sheetId: string, cells: { rowIndex: number; colIndex: number; value: any }[]) {
    // Group by row index
    const rowsMap = new Map<number, { colIndex: number; value: any }[]>();
    for (const cell of cells) {
      if (!rowsMap.has(cell.rowIndex)) rowsMap.set(cell.rowIndex, []);
      rowsMap.get(cell.rowIndex)!.push(cell);
    }

    // Process each row
    for (const [rowIndex, updates] of rowsMap.entries()) {
      let row = await this.rowRepo.findOne({ where: { sheetId, rowIndex } });
      if (!row) {
        row = this.rowRepo.create({ sheetId, rowIndex, data: [] });
      }

      const data = [...row.data];
      for (const update of updates) {
        // Extend array if needed
        while (data.length <= update.colIndex) data.push('');
        data[update.colIndex] = update.value;
      }

      await this.dataSource.query(`
        INSERT INTO sheet_rows (sheet_id, row_index, data, updated_at)
        VALUES ('${sheetId}', ${rowIndex}, '${JSON.stringify(data).replace(/'/g, "''")}'::jsonb, NOW())
        ON CONFLICT (sheet_id, row_index) DO UPDATE
          SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      `);
    }
  }
}
