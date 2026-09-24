import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { QueryModerationDto } from './dto/query-moderation.dto';

const MAX_POINTS = 1000;

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * #1239 — gists created over time, zero-filled with generate_series so
   * charts have no gaps.
   */
  async getGistsTimeseries(query: QueryTimeseriesDto) {
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
  }
}
