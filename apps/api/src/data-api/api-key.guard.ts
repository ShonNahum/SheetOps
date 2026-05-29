import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const rawKey = req.headers['x-api-key'];
    if (!rawKey) throw new UnauthorizedException('Missing X-API-Key header');

    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({ where: { keyHash: hash } });
    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    req.apiKeyWorkbookId = apiKey.workbookId;
    await this.apiKeyRepo.update(apiKey.id, { lastUsed: new Date() });
    
    return true;
  }
}
