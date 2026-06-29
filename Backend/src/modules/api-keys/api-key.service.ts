import { Injectable, Logger, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from './api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async generate(dto: CreateApiKeyDto, ownerAddress: string): Promise<{ plainKey: string; apiKey: ApiKey }> {
    const plainKey = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(plainKey).digest('hex');

    const existing = await this.apiKeyRepo.findOne({ where: { name: dto.name, ownerAddress } });
    if (existing) {
      throw new ConflictException(`API key with name "${dto.name}" already exists`);
    }

    const apiKey = this.apiKeyRepo.create({
      keyHash,
      name: dto.name,
      ownerAddress,
      scopes: dto.scopes ?? [],
      rateLimitPerMin: dto.rateLimitPerMin ?? 60,
    });

    await this.apiKeyRepo.save(apiKey);
    this.logger.log(`API key generated: name="${dto.name}" owner="${ownerAddress}"`);

    return { plainKey, apiKey };
  }

  async validate(keyHash: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepo.findOne({ where: { keyHash, isActive: true } });
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }
    return apiKey;
  }

  async recordUsage(apiKey: ApiKey): Promise<void> {
    await this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });
  }

  async checkRateLimit(apiKey: ApiKey, _windowStart: Date = new Date()): Promise<boolean> {
    const windowStart = new Date(_windowStart.getTime() - 60_000);
    const count = await this.apiKeyRepo
      .createQueryBuilder('ak')
      .where('ak.id = :id', { id: apiKey.id })
      .select('COUNT(*)', 'count')
      .getRawOne();

    return count < apiKey.rateLimitPerMin;
  }
}
