import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Small in-memory TTL cache for aggregate stats queries. Not distributed —
 * fine for a single backend instance; a shared cache (Redis) would be a
 * follow-up if this ever runs behind more than one instance.
 */
@Injectable()
export class StatsCacheService {
  private readonly store = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;

  constructor(private readonly config: ConfigService) {
    this.defaultTtlMs = this.config.get<number>('STATS_CACHE_TTL_MS', 30_000);
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.store.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const value = await fn();
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) });
    return value;
  }

  clear(): void {
    this.store.clear();
  }
}
