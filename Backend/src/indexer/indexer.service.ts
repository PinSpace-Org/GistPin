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
        if (event.type !== 'gist_posted' && event.type !== 'gist_edited') {
          this.logger.debug(`Skipping non-indexable event: ${event.type}`);
          this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
          continue;
        }

        const { gist } = event;
        const existing = await this.gistRepository.findByStellarGistId(gist.gistId);
        if (existing) {
          this.logger.debug(`Skipping already-indexed gist ${gist.gistId}`);
          this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
          continue;
        }

        this.logger.debug(`Indexed gist ${gist.gistId} @ cell ${gist.locationCell}`);
        const alreadyIndexed = await this.gistRepository.existsByStellarGistId(gist.gistId);

        if (alreadyIndexed) {
          this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
          continue;
        }

        const { lat, lon } = this.geoService.decode(gist.locationCell);

        try {
          await this.gistRepository.create({
            content: '',
            lat,
            lon,
            location_cell: gist.locationCell,
            content_hash: gist.contentHash,
            stellar_gist_id: gist.gistId,
            tx_hash: null,
          });
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code === PG_UNIQUE_VIOLATION) {
            this.logger.debug(
              `Gist ${gist.gistId} already indexed (SQLSTATE ${PG_UNIQUE_VIOLATION}); advancing cursor`,
            );
            this.lastProcessedLedger = Math.max(this.lastProcessedLedger, event.ledger);
            continue;
          }
          throw err;
        }

        this.logger.debug(
          `Indexed gist ${gist.gistId} @ cell ${gist.locationCell} (ledger ${event.ledger})`,
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
