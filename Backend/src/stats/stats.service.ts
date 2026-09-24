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
  }
}
