import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GIST_EVENT_TOPICS } from '../soroban/soroban.service';
import { QueryStatsEventsDto } from './dto/query-stats-events.dto';

const BUCKET_MS: Record<string, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const MAX_BUCKETS = 500;
const ALL_EVENT_TYPES = Object.values(GIST_EVENT_TOPICS);

export interface RecentEvent {
  type: string;
  ledger: number;
  stellarGistId: string | null;
  observedAt: Date;
}

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getEventStats(query: QueryStatsEventsDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('`from` must be a valid ISO date before `to`');
    }

    const bucketMs = BUCKET_MS[query.bucket];
    const bucketCount = Math.ceil((to.getTime() - from.getTime()) / bucketMs);
    if (bucketCount > MAX_BUCKETS) {
      throw new BadRequestException(`Range too large: ${bucketCount} buckets exceeds max of ${MAX_BUCKETS}`);
    }

    const params: unknown[] = [from, to];
    let typeClause = '';
    if (query.type) {
      params.push(query.type);
      typeClause = `AND event_type = $${params.length}`;
    }

    const rows = await this.dataSource.query<Array<{ bucket: Date; event_type: string; count: string }>>(
      `
      SELECT date_trunc('${query.bucket}', observed_at) AS bucket, event_type, COUNT(*) AS count
      FROM indexed_events
      WHERE observed_at >= $1 AND observed_at < $2 ${typeClause}
      GROUP BY bucket, event_type
      ORDER BY bucket
      `,
      params,
    );

    const types = query.type ? [query.type] : ALL_EVENT_TYPES;
    const countsByBucket = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const key = row.bucket.toISOString();
      const entry = countsByBucket.get(key) ?? {};
      entry[row.event_type] = Number(row.count);
      countsByBucket.set(key, entry);
    }

    const buckets: Array<{ bucket: string; counts: Record<string, number> }> = [];
    for (let t = from.getTime(); t < to.getTime(); t += bucketMs) {
      const bucketDate = new Date(t);
      const key = bucketDate.toISOString();
      const existing = countsByBucket.get(key) ?? {};
      const counts: Record<string, number> = {};
      for (const type of types) {
        counts[type] = existing[type] ?? 0;
      }
      buckets.push({ bucket: key, counts });
    }

    const recentParams: unknown[] = [from, to];
    let recentTypeClause = '';
    if (query.type) {
      recentParams.push(query.type);
      recentTypeClause = `AND event_type = $${recentParams.length}`;
    }
    recentParams.push(query.recentLimit ?? 20);

    const recentRows = await this.dataSource.query<
      Array<{ event_type: string; ledger: string; stellar_gist_id: string | null; observed_at: Date }>
    >(
      `
      SELECT event_type, ledger, stellar_gist_id, observed_at
      FROM indexed_events
      WHERE observed_at >= $1 AND observed_at < $2 ${recentTypeClause}
      ORDER BY observed_at DESC
      LIMIT $${recentParams.length}
      `,
      recentParams,
    );

    const recent: RecentEvent[] = recentRows.map((r) => ({
      type: r.event_type,
      ledger: Number(r.ledger),
      stellarGistId: r.stellar_gist_id,
      observedAt: r.observed_at,
    }));

    return { buckets, recent };
  }
}
