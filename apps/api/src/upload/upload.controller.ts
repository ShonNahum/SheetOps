import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { UploadService } from './upload.service';

@Controller('api/v1/workbooks')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || '/data/uploads',
        filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES || '2147483648', 10),
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const workbook = await this.uploadService.createWorkbook(file);
    const job = await this.uploadService.enqueueParseJob(workbook.id, file.path);
    return { jobId: job.id, workbookId: workbook.id };
  }
}
