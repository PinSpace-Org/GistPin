import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { StatsCacheService } from './cache/stats-cache.service';

interface OverviewRow {
  total: string;
  active: string;
  expired: string;
  hidden: string;
  unique_authors: string;
  signed: string;
  anonymous: string;
  api_submitted: string;
  indexed_only: string;
  total_reports: string;
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { QueryModerationDto } from './dto/query-moderation.dto';

const MAX_POINTS = 1000;
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
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: StatsCacheService,
  ) {}

  /**
   * #1238 — platform totals in one aggregate query. "Active" means not
   * hidden, not expired, and `is_active`.
   */
  async getOverview() {
    return this.cache.getOrSet('stats:overview', async () => {
      const [row] = await this.dataSource.query<OverviewRow[]>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE NOT hidden AND is_active AND expires_at > NOW()) AS active,
          COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired,
          COUNT(*) FILTER (WHERE hidden) AS hidden,
          COUNT(DISTINCT author_address) AS unique_authors,
          COUNT(*) FILTER (WHERE author_address IS NOT NULL) AS signed,
          COUNT(*) FILTER (WHERE author_address IS NULL) AS anonymous,
          COUNT(*) FILTER (WHERE tx_hash IS NOT NULL) AS api_submitted,
          COUNT(*) FILTER (WHERE tx_hash IS NULL) AS indexed_only,
          COALESCE(SUM(report_count), 0) AS total_reports
        FROM gists
      `);

      return {
        total: Number(row?.total ?? 0),
        active: Number(row?.active ?? 0),
        expired: Number(row?.expired ?? 0),
        hidden: Number(row?.hidden ?? 0),
        uniqueAuthors: Number(row?.unique_authors ?? 0),
        signed: Number(row?.signed ?? 0),
        anonymous: Number(row?.anonymous ?? 0),
        apiSubmitted: Number(row?.api_submitted ?? 0),
        indexedOnly: Number(row?.indexed_only ?? 0),
        totalReports: Number(row?.total_reports ?? 0),
      };
    });
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * #1239 — gists created over time, zero-filled with generate_series so
   * charts have no gaps.
   */
  async getGistsTimeseries(query: QueryTimeseriesDto) {
  async getEventStats(query: QueryStatsEventsDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('`from` must be a valid ISO date before `to`');
    }

    const interval = query.bucket === 'hour' ? '1 hour' : '1 day';
    const bucketMs = query.bucket === 'hour' ? 3_600_000 : 86_400_000;
    const pointCount = Math.ceil((to.getTime() - from.getTime()) / bucketMs);
    if (pointCount > MAX_POINTS) {
      throw new BadRequestException(`Range too large: ${pointCount} points exceeds max of ${MAX_POINTS}`);
    }

    const rows = await this.dataSource.query<
      Array<{ bucket: Date; count: string; signed: string; anonymous: string }>
    >(
      `
      WITH buckets AS (
        SELECT generate_series(date_trunc('${query.bucket}', $1::timestamptz), $2::timestamptz, $3::interval) AS bucket
      )
      SELECT
        b.bucket,
        COUNT(g.id) AS count,
        COUNT(g.id) FILTER (WHERE g.author_address IS NOT NULL) AS signed,
        COUNT(g.id) FILTER (WHERE g.author_address IS NULL) AS anonymous
      FROM buckets b
      LEFT JOIN gists g
        ON date_trunc('${query.bucket}', g.created_at) = b.bucket
        AND g.created_at >= $1 AND g.created_at < $2
      GROUP BY b.bucket
      ORDER BY b.bucket
      `,
      [from, to, interval],
    );

    return rows.map((row) => ({
      bucket: row.bucket.toISOString(),
      count: Number(row.count),
      signed: Number(row.signed),
      anonymous: Number(row.anonymous),
    }));
  }

  /** #1242 — moderation signals, including hidden gists. */
  async getModerationStats(query: QueryModerationDto) {
    const [summary] = await this.dataSource.query<
      Array<{ hidden_count: string; reported_count: string; total_reports: string }>
    >(`
      SELECT
        COUNT(*) FILTER (WHERE hidden) AS hidden_count,
        COUNT(*) FILTER (WHERE report_count > 0) AS reported_count,
        COALESCE(SUM(report_count), 0) AS total_reports
      FROM gists
    `);

    const histogramRows = await this.dataSource.query<Array<{ bucket: string; count: string }>>(`
      SELECT
        CASE
          WHEN report_count = 1 THEN '1'
          WHEN report_count = 2 THEN '2'
          WHEN report_count BETWEEN 3 AND 5 THEN '3-5'
          WHEN report_count BETWEEN 6 AND 10 THEN '6-10'
          WHEN report_count > 10 THEN 'above 10'
        END AS bucket,
        COUNT(*) AS count
      FROM gists
      WHERE report_count > 0
      GROUP BY bucket
    `);

    const histogramLabels = ['1', '2', '3-5', '6-10', 'above 10'];
    const histogram = histogramLabels.map((label) => ({
      bucket: label,
      count: Number(histogramRows.find((r) => r.bucket === label)?.count ?? 0),
    }));

    const topReportedRows = await this.dataSource.query<
      Array<{ id: string; report_count: number; hidden: boolean }>
    >(
      `
      SELECT id, report_count, hidden
      FROM gists
      WHERE report_count > 0
      ORDER BY report_count DESC, id ASC
      LIMIT $1
      `,
      [query.limit ?? 10],
    );

    return {
      hiddenCount: Number(summary?.hidden_count ?? 0),
      reportedCount: Number(summary?.reported_count ?? 0),
      totalReports: Number(summary?.total_reports ?? 0),
      histogram,
      topReported: topReportedRows.map((r) => ({
        id: r.id,
        reportCount: r.report_count,
        hidden: r.hidden,
      })),
    };
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
