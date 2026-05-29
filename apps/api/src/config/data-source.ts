import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'sheetops',
  password: process.env.POSTGRES_PASSWORD || 'changeme',
  database: process.env.POSTGRES_DB || 'sheetops',
  entities: ['src/entities/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
});
