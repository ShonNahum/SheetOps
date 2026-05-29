import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { WorkbooksModule } from './workbooks/workbooks.module';
import { UploadModule } from './upload/upload.module';
import { SheetsModule } from './sheets/sheets.module';
import { ExportModule } from './export/export.module';
import { DataApiModule } from './data-api/data-api.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './shared/redis.module';
import { BullConfigModule } from './shared/bull.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    RedisModule,
    BullConfigModule,
    WorkbooksModule,
    UploadModule,
    SheetsModule,
    ExportModule,
    DataApiModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}
