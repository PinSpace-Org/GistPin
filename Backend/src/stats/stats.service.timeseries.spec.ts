import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { StatsCacheService } from './cache/stats-cache.service';
import { StatsService } from './stats.service';

describe('StatsService.getGistsTimeseries', () => {
  let query: jest.Mock;
  let service: StatsService;

  beforeEach(() => {
    query = jest.fn();
    const dataSource = { query } as unknown as DataSource;
    const cache = { getOrSet: jest.fn() } as unknown as StatsCacheService;
    service = new StatsService(dataSource, cache);
  });

  it('passes the range and bucket interval to the zero-filling query', async () => {
    query.mockResolvedValue([]);

    await service.getGistsTimeseries({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-03T00:00:00.000Z',
      bucket: 'day',
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('generate_series');
    expect(params).toEqual([new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-03T00:00:00.000Z'), '1 day']);
  });

  it('returns empty buckets as zero counts', async () => {
    query.mockResolvedValue([
      { bucket: new Date('2026-01-01T00:00:00.000Z'), count: '0', signed: '0', anonymous: '0' },
      { bucket: new Date('2026-01-02T00:00:00.000Z'), count: '2', signed: '1', anonymous: '1' },
    ]);

    const result = await service.getGistsTimeseries({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-03T00:00:00.000Z',
      bucket: 'day',
    });

    expect(result).toEqual([
      { bucket: '2026-01-01T00:00:00.000Z', count: 0, signed: 0, anonymous: 0 },
      { bucket: '2026-01-02T00:00:00.000Z', count: 2, signed: 1, anonymous: 1 },
    ]);
  });

  it('accepts exactly 1000 points and rejects 1001', async () => {
    query.mockResolvedValue([]);
    const from = new Date('2026-01-01T00:00:00.000Z');

    await expect(
      service.getGistsTimeseries({
        from: from.toISOString(),
        to: new Date(from.getTime() + 1000 * 3_600_000).toISOString(),
        bucket: 'hour',
      }),
    ).resolves.toEqual([]);

    await expect(
      service.getGistsTimeseries({
        from: from.toISOString(),
        to: new Date(from.getTime() + 1001 * 3_600_000).toISOString(),
        bucket: 'hour',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an inverted range', async () => {
    await expect(
      service.getGistsTimeseries({
        from: '2026-01-03T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
        bucket: 'day',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
