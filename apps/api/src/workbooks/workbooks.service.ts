import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Workbook } from '../entities/workbook.entity';

@Injectable()
export class WorkbooksService {
  constructor(
    @InjectRepository(Workbook)
    private workbookRepo: Repository<Workbook>,
    private dataSource: DataSource,
  ) {}

  async findAll(page: number, limit: number) {
    const [data, total] = await this.workbookRepo.findAndCount({
      skip: page * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const workbook = await this.workbookRepo.findOne({
      where: { id },
      relations: ['sheets'],
      order: {
        sheets: { sheetIndex: 'ASC' }
      }
    });
    if (!workbook) throw new NotFoundException('Workbook not found');
    return workbook;
  }

  async remove(id: string) {
    const result = await this.workbookRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Workbook not found');
    return { success: true };
  }

  async getStatus(id: string) {
    const workbook = await this.workbookRepo.findOne({ where: { id } });
    if (!workbook) throw new NotFoundException('Workbook not found');
    return { status: workbook.status, errorMessage: workbook.errorMessage };
  }

  async search(query: string, limit: number = 50) {
    // Search for values containing the query string in all sheet rows
    const results = await this.dataSource.query(`
      SELECT 
        w.id as "workbookId",
        w.name as "workbookName",
        s.id as "sheetId",
        s.name as "sheetName",
        sr.row_index as "rowIndex",
        sr.data,
        w.original_filename as "originalFilename"
      FROM sheet_rows sr
      JOIN sheets s ON sr.sheet_id = s.id
      JOIN workbooks w ON s.workbook_id = w.id
      WHERE w.status = 'ready'
      AND (
        sr.data::text ILIKE $1
      )
      LIMIT $2
    `, [`%${query}%`, limit]);

    // Process results to include column index and formatted value
    const processedResults = results.map((row: any) => {
      const data = row.data || [];
      const matches: any[] = [];
      
      data.forEach((value: any, colIndex: number) => {
        const strValue = String(value || '');
        if (strValue.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            colIndex,
            value: strValue,
          });
        }
      });

      return {
        workbookId: row.workbookId,
        workbookName: row.workbookName,
        originalFilename: row.originalFilename,
        sheetId: row.sheetId,
        sheetName: row.sheetName,
        rowIndex: row.rowIndex,
        matches,
      };
    });

    // Filter to only results with matches
    return processedResults.filter((r: any) => r.matches.length > 0).slice(0, limit);
  }
}
