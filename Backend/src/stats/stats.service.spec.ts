import { BadRequestException } from '@nestjs/common';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let dataSource: { query: jest.Mock };
  let service: StatsService;

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    service = new StatsService(dataSource as any);
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
