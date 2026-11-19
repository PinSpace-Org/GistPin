import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { QueryModerationDto } from './dto/query-moderation.dto';
import { QueryStatsEventsDto } from './dto/query-stats-events.dto';
import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  let service: {
    getOverview: jest.Mock;
    getGistsTimeseries: jest.Mock;
    getModerationStats: jest.Mock;
    getEventStats: jest.Mock;
  };

  // Same options the application registers globally.
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const parse = <T>(value: unknown, metatype: new () => T) =>
    pipe.transform(value, { type: 'query', metatype }) as Promise<T>;

  beforeEach(async () => {
    service = {
      getOverview: jest.fn().mockResolvedValue({ total: 3 }),
      getGistsTimeseries: jest.fn().mockResolvedValue([{ bucket: 'b', count: 1 }]),
      getModerationStats: jest.fn().mockResolvedValue({ hidden: 0 }),
      getEventStats: jest.fn().mockResolvedValue({ buckets: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: service }],
    }).compile();

    controller = module.get(StatsController);
  });

  it('GET overview delegates to StatsService.getOverview', async () => {
    await expect(controller.getOverview()).resolves.toEqual({ total: 3 });
    expect(service.getOverview).toHaveBeenCalledTimes(1);
  });

  it('GET timeseries/gists passes the parsed query to getGistsTimeseries', async () => {
    const query = await parse(
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z', bucket: 'day' },
      QueryTimeseriesDto,
    );

    await expect(controller.getGistsTimeseries(query)).resolves.toEqual([{ bucket: 'b', count: 1 }]);
    expect(query).toBeInstanceOf(QueryTimeseriesDto);
    expect(service.getGistsTimeseries).toHaveBeenCalledWith(query);
  });

  it('GET moderation passes the parsed query, converting limit to a number', async () => {
    const query = await parse({ limit: '5' }, QueryModerationDto);

    await expect(controller.getModeration(query)).resolves.toEqual({ hidden: 0 });
    expect(query.limit).toBe(5);
    expect(service.getModerationStats).toHaveBeenCalledWith(query);
  });

  it('GET moderation applies the default limit when none is given', async () => {
    const query = await parse({}, QueryModerationDto);

    expect(query.limit).toBe(10);
  });

  it('GET events passes the parsed query to getEventStats', async () => {
    const query = await parse(
      {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        bucket: 'hour',
        recentLimit: '7',
      },
      QueryStatsEventsDto,
    );

    await expect(controller.getEvents(query)).resolves.toEqual({ buckets: [] });
    expect(query.recentLimit).toBe(7);
    expect(service.getEventStats).toHaveBeenCalledWith(query);
  });

  describe('query validation', () => {
    it('rejects a timeseries query with an unsupported bucket', async () => {
      await expect(
        parse(
          { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z', bucket: 'week' },
          QueryTimeseriesDto,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a timeseries query whose range is not an ISO 8601 date', async () => {
      await expect(
        parse({ from: 'yesterday', to: '2026-01-02T00:00:00.000Z', bucket: 'day' }, QueryTimeseriesDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a moderation limit above 50', async () => {
      await expect(parse({ limit: '51' }, QueryModerationDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an events query with recentLimit above 100', async () => {
      await expect(
        parse(
          {
            from: '2026-01-01T00:00:00.000Z',
            to: '2026-01-02T00:00:00.000Z',
            bucket: 'day',
            recentLimit: '101',
          },
          QueryStatsEventsDto,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
