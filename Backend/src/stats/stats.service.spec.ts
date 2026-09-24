import { StatsService } from './stats.service';
import { StatsCacheService } from './cache/stats-cache.service';

describe('StatsService.getOverview', () => {
  let dataSource: { query: jest.Mock };
  let cache: StatsCacheService;
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
  });
});
