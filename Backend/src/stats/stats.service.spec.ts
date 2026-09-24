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
  });
});
