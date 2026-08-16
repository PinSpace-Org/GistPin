import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModeratorResponseDto } from './dto/moderator-response.dto';

/**
 * Issue #1038 — expose the current moderator (contract `get_admin()`)
 * over the REST API. The address is configuration-backed so it stays a
 * lightweight, read-only call; the indexer/event-persistence work can later
 * mirror it into Postgres without changing this contract.
 */
@Injectable()
export class ModeratorService {
  constructor(private readonly config: ConfigService) {}

  getModerator(): ModeratorResponseDto {
    const address = this.config.get<string>('MODERATOR_ADDRESS', '') ?? '';
    if (!address) {
      throw new ServiceUnavailableException('Moderator address is not configured');
    }
    return { address };
  }
}
