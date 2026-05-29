import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheetsController } from './sheets.controller';
import { SheetsService } from './sheets.service';
import { Sheet } from '../entities/sheet.entity';
import { SheetRow } from '../entities/sheet-row.entity';
import { Workbook } from '../entities/workbook.entity';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sheet, SheetRow, Workbook]), ExportModule],
  controllers: [SheetsController],
  providers: [SheetsService],
  exports: [SheetsService]
})
export class SheetsModule {}
