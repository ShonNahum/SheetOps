import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkbooksController } from './workbooks.controller';
import { WorkbooksService } from './workbooks.service';
import { ApiKeysController } from './api-keys.controller';
import { Workbook } from '../entities/workbook.entity';
import { ApiKey } from '../entities/api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workbook, ApiKey])],
  controllers: [WorkbooksController, ApiKeysController],
  providers: [WorkbooksService],
  exports: [WorkbooksService]
})
export class WorkbooksModule {}
