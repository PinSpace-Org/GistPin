import { BadRequestException } from '@nestjs/common';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let dataSource: { query: jest.Mock };
  let service: StatsService;

  beforeEach(() => {
    dataSource = { query: jest.fn() };
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
