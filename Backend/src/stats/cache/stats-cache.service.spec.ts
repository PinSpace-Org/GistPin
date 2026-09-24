import { StatsCacheService } from './stats-cache.service';

describe('StatsCacheService', () => {
  let config: { get: jest.Mock };
  let cache: StatsCacheService;

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue(30_000) };
    cache = new StatsCacheService(config as any);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the cached value without re-invoking fn within the TTL', async () => {
    const fn = jest.fn().mockResolvedValue('value');

    await cache.getOrSet('key', fn);
    await cache.getOrSet('key', fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-invokes fn once the TTL has expired', async () => {
    const fn = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    await cache.getOrSet('key', fn, 1_000);
    jest.advanceTimersByTime(1_001);
    const second = await cache.getOrSet('key', fn, 1_000);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(second).toBe('second');
  });

  it('clear() forces the next call to re-invoke fn', async () => {
    const fn = jest.fn().mockResolvedValue('value');

    await cache.getOrSet('key', fn);
    cache.clear();
    await cache.getOrSet('key', fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
