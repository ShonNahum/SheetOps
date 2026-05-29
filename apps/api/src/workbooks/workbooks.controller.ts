import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { WorkbooksService } from './workbooks.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('api/v1/workbooks')
export class WorkbooksController {
  constructor(private readonly workbooksService: WorkbooksService) {}

  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.length < 2) {
      return { results: [] };
    }
    const results = await this.workbooksService.search(query, limit ? parseInt(limit) : 50);
    return { results, query };
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.workbooksService.findAll(query.page || 0, query.limit || 50);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workbooksService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.workbooksService.remove(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.workbooksService.getStatus(id);
  }
}
