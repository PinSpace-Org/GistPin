import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const plainKey = authHeader.slice(7).trim();
    if (!plainKey) {
      throw new UnauthorizedException('Empty API key');
    }

    const keyHash = createHash('sha256').update(plainKey).digest('hex');

    try {
      const apiKey = await this.apiKeyService.validate(keyHash);

      const withinLimit = await this.apiKeyService.checkRateLimit(apiKey);
      if (!withinLimit) {
        throw new UnauthorizedException('Rate limit exceeded');
      }

      await this.apiKeyService.recordUsage(apiKey);

      request.apiKey = {
        id: apiKey.id,
        name: apiKey.name,
        ownerAddress: apiKey.ownerAddress,
        scopes: apiKey.scopes,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('API key validation failed', (err as Error).message);
      throw new UnauthorizedException('API key validation failed');
    }
  }
}
