import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IndexedEvent } from './indexed-event.entity';
import { PG_UNIQUE_VIOLATION } from '../gists/gist.repository';
import type { GistRegistryEvent } from '../soroban/soroban.service';

/**
 * Extracts the gist id a decoded event refers to, when it has one.
 * `gist_posted`/`gist_edited` carry it nested under `gist.gistId`; the
 * rest carry a bare `gistId`.
 */
function extractStellarGistId(event: GistRegistryEvent): string | null {
  if (event.type === 'gist_posted' || event.type === 'gist_edited') {
    return event.gist.gistId ?? null;
  }
  return 'gistId' in event ? event.gistId : null;
}

@Injectable()
export class EventLogRepository {
  private readonly logger = new Logger(EventLogRepository.name);

  constructor(
    @InjectRepository(IndexedEvent)
    private readonly repository: Repository<IndexedEvent>,
  ) {}

  /**
   * Append one decoded event to the log. Idempotent: replaying an event
   * with an `id` already on file is a no-op, not an error — matching the
   * indexer's "one malformed/duplicate event must never wedge the poll
   * loop" design.
   */
  async record(event: GistRegistryEvent): Promise<void> {
    const entity = this.repository.create({
      eventId: event.id,
      ledger: event.ledger,
      eventType: event.type,
      stellarGistId: extractStellarGistId(event),
      payload: event as unknown as Record<string, unknown>,
    });

    try {
      await this.repository.insert(entity);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        this.logger.debug(`Event ${event.id} already logged — duplicate handled`);
        return;
      }
      throw err;
    }
  }
}
