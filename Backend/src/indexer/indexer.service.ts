import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SorobanService } from '../soroban/soroban.service';
import { GistRepository } from '../gists/gist.repository';
import { GeoService } from '../geo/geo.service';
import { IndexerState } from './indexer-state.entity';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  private readonly cursorName = 'gist-indexer';

  /**
   * Prevent overlapping polling cycles.
   */
  private polling = false;

  constructor(
    private readonly soroban: SorobanService,
    private readonly gistRepository: GistRepository,
    private readonly geoService: GeoService,

    @InjectRepository(IndexerState)
    private readonly indexerStateRepository: Repository<IndexerState>,
  ) {}

  /**
   * Poll Soroban every 10 seconds.
   */
  @Interval(10_000)
  async poll(): Promise<void> {
    if (this.polling) {
      this.logger.debug(
        'Indexer poll already running; skipping tick',
      );
      return;
    }

    this.polling = true;

    try {
      const lastProcessedLedger =
        await this.getLastProcessedLedger();

      const events =
        await this.soroban.getEventsSince(
          lastProcessedLedger,
        );

      if (events.length === 0) {
        return;
      }

      this.logger.log(
        `Indexer: ${events.length} new event(s) from ledger ${lastProcessedLedger}`,
      );

      let highestProcessedLedger =
        lastProcessedLedger;

      for (const event of events) {
        /*
         * Advance the cursor based on the ledger regardless
         * of whether this individual event can be processed.
         *
         * This prevents one malformed event from permanently
         * wedging the indexer.
         */
        highestProcessedLedger = Math.max(
          highestProcessedLedger,
          event.ledger,
        );

        try {
          await this.handleEvent(event);
        } catch (err) {
          this.logger.warn(
            `Skipping event at ledger ${event.ledger}: ${
              err instanceof Error
                ? err.message
                : String(err)
            }`,
          );
        }
      }

      if (
        highestProcessedLedger >
        lastProcessedLedger
      ) {
        await this.saveLastProcessedLedger(
          highestProcessedLedger,
        );

        this.logger.debug(
          `Indexer cursor advanced to ledger ${highestProcessedLedger}`,
        );
      }
    } catch (err) {
      this.logger.error(
        'Indexer poll failed',
        err instanceof Error
          ? err.message
          : String(err),
        err instanceof Error ? err.stack : undefined,
      );
    } finally {
      this.polling = false;
    }
  }

  /**
   * Handle one decoded Soroban event.
   *
   * Event-specific persistence can be moved into a
   * dedicated persistence handler when that issue lands.
   */
  private async handleEvent(event: any): Promise<void> {
    if (
      event.type !== 'gist_posted' &&
      event.type !== 'gist_edited'
    ) {
      this.logger.debug(
        `Skipping non-indexable event: ${event.type}`,
      );
      return;
    }

    const { gist } = event;

    if (!gist) {
      throw new Error(
        `Missing gist payload for ${event.type} event`,
      );
    }

    if (
      !gist.gistId ||
      !gist.locationCell
    ) {
      throw new Error(
        `Malformed gist event at ledger ${event.ledger}`,
      );
    }

    const existing =
      await this.gistRepository.findByStellarGistId(
        gist.gistId,
      );

    if (existing) {
      this.logger.debug(
        `Skipping already-indexed gist ${gist.gistId}`,
      );
      return;
    }

    const alreadyIndexed =
      await this.gistRepository.existsByStellarGistId(
        gist.gistId,
      );

    if (alreadyIndexed) {
      this.logger.debug(
        `Gist ${gist.gistId} already indexed`,
      );
      return;
    }

    const { lat, lon } =
      this.geoService.decode(
        gist.locationCell,
      );

    await this.gistRepository.create({
      content: '',
      lat,
      lon,
      location_cell: gist.locationCell,
      content_hash: gist.contentHash,
      stellar_gist_id: gist.gistId,
      tx_hash: null,
    });

    this.logger.debug(
      `Indexed gist ${gist.gistId} @ cell ${gist.locationCell} (ledger ${event.ledger})`,
    );
  }

  /**
   * Load the persisted cursor from PostgreSQL. If no cursor exists yet,
   * seed it from the current chain ledger rather than starting from
   * genesis (Soroban RPC also rejects startLedger: 0 outright).
   */
  private async getLastProcessedLedger(): Promise<number> {
    const state =
      await this.indexerStateRepository.findOne({
        where: {
          name: this.cursorName,
        },
      });

    if (!state) {
      const latestLedger = await this.soroban.getLatestLedger();

      this.logger.log(
        `No indexer cursor found; seeding from current ledger ${latestLedger}`,
      );

      await this.saveLastProcessedLedger(latestLedger);

      return latestLedger;
    }

    return Number(
      state.lastProcessedLedger,
    );
  }

  /**
   * Persist the latest processed ledger.
   */
  private async saveLastProcessedLedger(
    ledger: number,
  ): Promise<void> {
    let state =
      await this.indexerStateRepository.findOne({
        where: {
          name: this.cursorName,
        },
      });

    if (!state) {
      state =
        this.indexerStateRepository.create({
          name: this.cursorName,
          lastProcessedLedger: ledger,
        });
    } else {
      state.lastProcessedLedger = ledger;
    }

    await this.indexerStateRepository.save(
      state,
    );
  }
}