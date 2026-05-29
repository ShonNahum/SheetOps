import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { DataApiService } from './data-api.service';
import { ApiKeyGuard } from './api-key.guard';

@Controller('api/v1/data/:workbookId/:sheetName')
@UseGuards(ApiKeyGuard)
export class DataApiController {
  constructor(private readonly dataApiService: DataApiService) {}

  @Get()
  async readRows(
    @Req() req: any,
    @Param('workbookId') workbookId: string,
    @Param('sheetName') sheetName: string,
    @Query('page') page: number = 0,
    @Query('pageSize') pageSize: number = 200,
  ) {
    this.verifyAccess(req, workbookId);
    return this.dataApiService.readRows(workbookId, sheetName, page, pageSize);
  }

  @Post()
  async appendRows(
    @Req() req: any,
    @Param('workbookId') workbookId: string,
    @Param('sheetName') sheetName: string,
    @Body() body: { rows: any[][] },
  ) {
    this.verifyAccess(req, workbookId);
    return this.dataApiService.appendRows(workbookId, sheetName, body.rows);
  }

  @Patch()
  async updateCells(
    @Req() req: any,
    @Param('workbookId') workbookId: string,
    @Param('sheetName') sheetName: string,
    @Body() body: { cells: { rowIndex: number; colIndex: number; value: any }[] },
  ) {
    this.verifyAccess(req, workbookId);
    return this.dataApiService.updateCells(workbookId, sheetName, body.cells);
  }

  private verifyAccess(req: any, requestedWorkbookId: string) {
    if (req.apiKeyWorkbookId !== requestedWorkbookId) {
      throw new Error('API Key does not have access to this workbook');
    }
  }
}
