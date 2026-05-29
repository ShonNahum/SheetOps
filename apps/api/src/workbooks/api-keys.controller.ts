import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import * as crypto from 'crypto';

@Controller('api/v1/workbooks/:id/api-keys')
export class ApiKeysController {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepo: Repository<ApiKey>,
  ) {}

  @Get()
  async listKeys(@Param('id') workbookId: string) {
    const keys = await this.apiKeyRepo.find({ where: { workbookId } });
    return keys.map(k => ({ id: k.id, name: k.name, lastUsed: k.lastUsed, createdAt: k.createdAt }));
  }

  @Post()
  async generateKey(@Param('id') workbookId: string) {
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = this.apiKeyRepo.create({
      workbookId,
      name: 'Default Integration',
      keyHash,
    });
    await this.apiKeyRepo.save(apiKey);

    return { id: apiKey.id, name: apiKey.name, key: rawKey };
  }

  @Delete(':keyId')
  async revokeKey(@Param('id') workbookId: string, @Param('keyId') keyId: string) {
    await this.apiKeyRepo.delete({ id: keyId, workbookId });
    return { success: true };
  }
}
