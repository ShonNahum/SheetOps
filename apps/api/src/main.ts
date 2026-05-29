import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Ensure directories exist
  const uploadDir = process.env.UPLOAD_DIR || '/data/uploads';
  const tempDir = process.env.TEMP_DIR || '/data/temp';
  
  [uploadDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // multer handles it
    logger: ['error', 'warn', 'log'],
  });

  // Re-enable body parser for everything except /api/v1/workbooks/upload
  const express = require('express');
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/api/v1/workbooks/upload') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') });
  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on port ${port}`);
}
bootstrap();
