import { Module, forwardRef } from '@nestjs/common';
import { ExportService } from './export.service';
import { WorkbooksModule } from '../workbooks/workbooks.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [forwardRef(() => WorkbooksModule), forwardRef(() => SheetsModule)],
  providers: [ExportService],
  exports: [ExportService]
})
export class ExportModule {}
