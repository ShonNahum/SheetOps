import { Controller, Get, Patch, Param, Query, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { SheetsService } from './sheets.service';
import { ExportService } from '../export/export.service';
import { UpdateCellsDto } from './dto/update-cells.dto';

@Controller('api/v1/workbooks/:id')
export class SheetsController {
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('sheets')
  async listSheets(@Param('id') workbookId: string) {
    return this.sheetsService.findByWorkbook(workbookId);
  }

  @Get('sheets/:sheetId/rows')
  async getRows(
    @Param('id') workbookId: string,
    @Param('sheetId') sheetId: string,
    @Query('page') page: number = 0,
    @Query('pageSize') pageSize: number = 200,
  ) {
    return this.sheetsService.getRows(sheetId, page, pageSize);
  }

  @Get('sheets/:sheetId/rows/:rowIndex')
  async getRow(
    @Param('id') workbookId: string,
    @Param('sheetId') sheetId: string,
    @Param('rowIndex') rowIndex: string,
  ) {
    return this.sheetsService.getRow(sheetId, Number(rowIndex));
  }

  @Get('sheets/:sheetId/cells/:rowIndex/:colIndex')
  async getCell(
    @Param('id') workbookId: string,
    @Param('sheetId') sheetId: string,
    @Param('rowIndex') rowIndex: string,
    @Param('colIndex') colIndex: string,
  ) {
    return this.sheetsService.getCell(sheetId, Number(rowIndex), Number(colIndex));
  }

  @Get('sheets/:sheetId/columns/:colIndex')
  async getColumn(
    @Param('id') workbookId: string,
    @Param('sheetId') sheetId: string,
    @Param('colIndex') colIndex: string,
  ) {
    return this.sheetsService.getColumn(sheetId, Number(colIndex));
  }

  @Patch('sheets/:sheetId/cells')
  async updateCells(
    @Param('id') workbookId: string,
    @Param('sheetId') sheetId: string,
    @Body() updateCellsDto: UpdateCellsDto,
  ) {
    await this.sheetsService.updateCells(sheetId, updateCellsDto.cells);
    return { success: true };
  }

  @Get('export')
  async exportWorkbook(@Param('id') workbookId: string, @Res() res: Response) {
    await this.exportService.exportToStream(workbookId, res);
  }
}
