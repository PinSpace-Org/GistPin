import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SorobanService } from '../soroban/soroban.service';
import { GistRepository, PG_UNIQUE_VIOLATION } from '../gists/gist.repository';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private lastProcessedLedger = 0;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly soroban: SorobanService,
    private readonly gistRepository: GistRepository,
    private readonly geoService: GeoService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Indexer starting — polling Soroban for GistRegistry events every 10s');
    this.startPolling();
  }

  startPolling(intervalMs = 10_000): void {
    this.pollInterval = setInterval(() => {
      void this.poll();
    }, intervalMs);
  }

  async poll(): Promise<void> {
    try {
      const events = await this.soroban.getEventsSince(this.lastProcessedLedger);

      if (events.length === 0) return;

      this.logger.log(
        `Indexer: ${events.length} new event(s) from ledger ${this.lastProcessedLedger}`,
      );

      for (const event of events) {
        const existing = await this.gistRepository.findByStellarGistId(event.gistId);
        if (existing) {
          this.logger.debug(`Skipping already-indexed gist ${event.gistId}`);
          this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.createdAt);
          continue;
        }

        this.logger.debug(`Indexed gist ${event.gistId} @ cell ${event.locationCell}`);
        this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.createdAt);
        const alreadyIndexed = await this.gistRepository.existsByStellarGistId(event.gistId);

        if (alreadyIndexed) {
          this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
          continue;
        }

        const { lat, lon } = this.geoService.decode(event.locationCell);

        try {
          await this.gistRepository.create({
            content: '',
            lat,
            lon,
            location_cell: event.locationCell,
            content_hash: event.contentHash,
            stellar_gist_id: event.gistId,
            tx_hash: null,
          });
        } catch (err) {
          // Issue #98 — concurrent pollers race on the same stellar_gist_id.
          // The companion migration adds a UNIQUE(stellar_gist_id) constraint,
          // so the loser of the race surfaces Postgres SQLSTATE 23505. Treat
          // it as "already indexed by another writer" and advance the cursor
          // instead of aborting the poll loop.
          const code = (err as { code?: string })?.code;
          if (code === PG_UNIQUE_VIOLATION) {
            this.logger.debug(
              `Gist ${event.gistId} already indexed (SQLSTATE ${PG_UNIQUE_VIOLATION}); advancing cursor`,
            );
            this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
            continue;
          }
          throw err;
        }

        this.logger.debug(
          `Indexed gist ${event.gistId} @ cell ${event.locationCell} (ledger ${event.ledger})`,
        );

        this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
      }
    } catch (err) {
      this.logger.error('Indexer poll failed', (err as Error).message, (err as Error).stack);
    }
  }

  onModuleDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
