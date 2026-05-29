import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sheet } from '../entities/sheet.entity';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class DataApiService {
  constructor(
    @InjectRepository(Sheet) private sheetRepo: Repository<Sheet>,
    private sheetsService: SheetsService,
  ) {}

  private async getSheet(workbookId: string, sheetName: string): Promise<Sheet> {
    const sheet = await this.sheetRepo.findOne({ where: { workbookId, name: sheetName } });
    if (!sheet) throw new NotFoundException(`Sheet ${sheetName} not found in workbook`);
    return sheet;
  }

  async readRows(workbookId: string, sheetName: string, page: number, pageSize: number) {
    const sheet = await this.getSheet(workbookId, sheetName);
    return this.sheetsService.getRows(sheet.id, page, pageSize);
  }

  async appendRows(workbookId: string, sheetName: string, newRows: any[][]) {
    const sheet = await this.getSheet(workbookId, sheetName);
    const startRowIndex = sheet.rowCount;
    
    const rowsToUpsert = newRows.map((data, idx) => ({
      rowIndex: startRowIndex + idx,
      data
    }));

    await this.sheetsService.upsertRows(sheet.id, rowsToUpsert);
    
    // Update sheet row count
    sheet.rowCount += newRows.length;
    await this.sheetRepo.save(sheet);

    return { success: true, appended: newRows.length };
  }

  async updateCells(workbookId: string, sheetName: string, cells: { rowIndex: number; colIndex: number; value: any }[]) {
    const sheet = await this.getSheet(workbookId, sheetName);
    await this.sheetsService.updateCells(sheet.id, cells);
    return { success: true, updated: cells.length };
  }
}
