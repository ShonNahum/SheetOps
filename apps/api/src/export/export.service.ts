import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { WorkbooksService } from '../workbooks/workbooks.service';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class ExportService {
  constructor(
    @Inject(forwardRef(() => WorkbooksService))
    private workbooksService: WorkbooksService,
    @Inject(forwardRef(() => SheetsService))
    private sheetsService: SheetsService,
  ) {}

  async exportToStream(workbookId: string, res: Response) {
    const workbook = await this.workbooksService.findOne(workbookId);
    if (!workbook || !workbook.sheets) {
      throw new Error('Workbook not found or has no sheets');
    }

    // Support Unicode filenames with RFC 5987 encoding
    const filename = `${workbook.name}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}; filename="${filename}"`);

    const xlsxWorkbook = new ExcelJS.stream.xlsx.WorkbookWriter({ 
      stream: res,
      useStyles: true,
      useSharedStrings: true 
    });

    // Sort sheets by index to maintain order
    const sheets = [...workbook.sheets].sort((a, b) => a.sheetIndex - b.sheetIndex);
    
    for (const sheet of sheets) {
      // Create a new worksheet for each sheet
      const worksheet = xlsxWorkbook.addWorksheet(sheet.name || `Sheet ${sheet.sheetIndex + 1}`);
      
      // Add headers if they exist
      if (sheet.headers && Array.isArray(sheet.headers) && sheet.headers.length > 0) {
        const headerRow = worksheet.addRow(sheet.headers);
        // Style the header row
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
      }

      // Fetch and add rows in batches
      const BATCH_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const rows = await this.sheetsService.getRowsBatch(sheet.id, page * BATCH_SIZE, BATCH_SIZE);
        
        if (!rows || rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          if (row.data && Array.isArray(row.data)) {
            worksheet.addRow(row.data);
          }
        }

        // Commit worksheet after each batch to manage memory
        await worksheet.commit();
        
        hasMore = rows.length === BATCH_SIZE;
        page++;
      }
    }

    // Finalize the workbook
    await xlsxWorkbook.commit();
  }
}
