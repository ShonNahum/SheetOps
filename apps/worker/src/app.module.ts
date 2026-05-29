import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { ProcessorsModule } from './processors/processors.module';
import { Workbook } from './entities/workbook.entity';
import { Sheet } from './entities/sheet.entity';
import { SheetRow } from './entities/sheet-row.entity';
import { Job } from './entities/job.entity';
import { ApiKey } from './entities/api-key.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.db'),
        entities: [Workbook, Sheet, SheetRow, Job, ApiKey],
        synchronize: false, // Handled by API
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
    }),
    ProcessorsModule,
  ],
})
export class AppModule {}
