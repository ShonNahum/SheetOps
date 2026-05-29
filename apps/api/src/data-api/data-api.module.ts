import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataApiController } from './data-api.controller';
import { DataApiService } from './data-api.service';
import { ApiKey } from '../entities/api-key.entity';
import { SheetsModule } from '../sheets/sheets.module';
import { WorkbooksModule } from '../workbooks/workbooks.module';
import { Sheet } from '../entities/sheet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, Sheet]), SheetsModule, WorkbooksModule],
  controllers: [DataApiController],
  providers: [DataApiService],
})
export class DataApiModule {}
