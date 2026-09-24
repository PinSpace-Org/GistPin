import { StatsService } from './stats.service';
import { StatsCacheService } from './cache/stats-cache.service';

describe('StatsService.getOverview', () => {
  let dataSource: { query: jest.Mock };
  let cache: StatsCacheService;
import { BadRequestException } from '@nestjs/common';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let dataSource: { query: jest.Mock };
  let service: StatsService;

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    // Real cache with a throwaway ConfigService so getOverview's single
    // query is actually exercised, not short-circuited by a mock cache.
    cache = new StatsCacheService({ get: jest.fn().mockReturnValue(30_000) } as any);
    service = new StatsService(dataSource as any, cache);
  });

  it('maps each FILTER-clause counter from the aggregate row', async () => {
    dataSource.query.mockResolvedValue([
      {
        total: '10',
        active: '6',
        expired: '2',
        hidden: '1',
        unique_authors: '4',
        signed: '5',
        anonymous: '5',
        api_submitted: '3',
        indexed_only: '7',
        total_reports: '9',
      },
    ]);

    const result = await service.getOverview();

    expect(result).toEqual({
      total: 10,
      active: 6,
      expired: 2,
      hidden: 1,
      uniqueAuthors: 4,
      signed: 5,
      anonymous: 5,
      apiSubmitted: 3,
      indexedOnly: 7,
      totalReports: 9,
    });
  });

  it('caches the result so a second call does not re-query', async () => {
    dataSource.query.mockResolvedValue([{}]);

    await service.getOverview();
    await service.getOverview();

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    service = new StatsService(dataSource as any);
  });

  describe('getGistsTimeseries', () => {
    it('rejects a range producing more points than the max', async () => {
      await expect(
        service.getGistsTimeseries({
          from: '2000-01-01T00:00:00.000Z',
          to: '2020-01-01T00:00:00.000Z',
          bucket: 'day',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps rows to bucket/count/signed/anonymous', async () => {
      dataSource.query.mockResolvedValue([
        { bucket: new Date('2026-01-01T00:00:00.000Z'), count: '2', signed: '1', anonymous: '1' },
      ]);

      const result = await service.getGistsTimeseries({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        bucket: 'day',
      });

      expect(result).toEqual([
        { bucket: '2026-01-01T00:00:00.000Z', count: 2, signed: 1, anonymous: 1 },
      ]);
    });
  });

  describe('getModerationStats', () => {
    it('builds the histogram with zero-filled edges', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ hidden_count: '3', reported_count: '5', total_reports: '20' }])
        .mockResolvedValueOnce([{ bucket: '3-5', count: '2' }])
        .mockResolvedValueOnce([]);

      const result = await service.getModerationStats({ limit: 10 });

      expect(result.hiddenCount).toBe(3);
      expect(result.histogram).toEqual([
        { bucket: '1', count: 0 },
        { bucket: '2', count: 0 },
        { bucket: '3-5', count: 2 },
        { bucket: '6-10', count: 0 },
        { bucket: 'above 10', count: 0 },
      ]);
      expect(result.topReported).toEqual([]);
    });
  it('rejects a range producing more buckets than the max', async () => {
    await expect(
      service.getEventStats({
        from: '2020-01-01T00:00:00.000Z',
        to: '2021-01-01T00:00:00.000Z',
        bucket: 'hour',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('zero-fills buckets with no matching rows', async () => {
    dataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.getEventStats({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-01T02:00:00.000Z',
      bucket: 'hour',
      type: 'gist_posted',
    } as any);

    expect(result.buckets).toHaveLength(2);
    expect(result.buckets[0].counts.gist_posted).toBe(0);
  });

  it('returns the recent array from the second query', async () => {
    dataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { event_type: 'gist_posted', ledger: '10', stellar_gist_id: 'g1', observed_at: new Date() },
      ]);

    const result = await service.getEventStats({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-01T01:00:00.000Z',
      bucket: 'hour',
    } as any);

    expect(result.recent).toEqual([
      expect.objectContaining({ type: 'gist_posted', ledger: 10, stellarGistId: 'g1' }),
    ]);
  });
});
