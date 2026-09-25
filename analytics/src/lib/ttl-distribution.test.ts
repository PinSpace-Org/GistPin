import { describe, it, expect } from 'vitest';
import {
  NO_EXPIRY_LABEL,
  TTL_BUCKETS,
  bucketIndexForMs,
  bucketLabel,
  bucketRangeLabel,
  countTtlBuckets,
  isEmptyTtlResponse,
  mostCommonBucket,
} from './ttl-distribution';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function countOf(counts: { label: string; count: number }[], label: string): number {
  return counts.find((entry) => entry.label === label)?.count ?? -1;
}

describe('bucketIndexForMs', () => {
  it('places durations in the fixed buckets', () => {
    expect(bucketIndexForMs(30 * 60_000)).toBe(0);
    expect(bucketIndexForMs(3 * HOUR)).toBe(1);
    expect(bucketIndexForMs(8 * HOUR)).toBe(2);
    expect(bucketIndexForMs(20 * HOUR)).toBe(3);
    expect(bucketIndexForMs(2 * DAY)).toBe(4);
    expect(bucketIndexForMs(5 * DAY)).toBe(5);
    expect(bucketIndexForMs(10 * DAY)).toBe(6);
    expect(bucketIndexForMs(90 * DAY)).toBe(7);
  });

  it('treats bucket edges as inclusive of the lower bound', () => {
    expect(bucketIndexForMs(HOUR)).toBe(1);
    expect(bucketIndexForMs(DAY)).toBe(4);
  });

  it('returns null for invalid durations', () => {
    expect(bucketIndexForMs(-1)).toBeNull();
    expect(bucketIndexForMs(Number.NaN)).toBeNull();
    expect(bucketIndexForMs(null)).toBeNull();
    expect(bucketIndexForMs(undefined)).toBeNull();
  });
});

describe('bucketLabel', () => {
  it('maps an index to its label', () => {
    expect(bucketLabel(0)).toBe(TTL_BUCKETS[0].label);
    expect(bucketLabel(99)).toBe(NO_EXPIRY_LABEL);
    expect(bucketLabel(null)).toBe(NO_EXPIRY_LABEL);
  });
});

describe('bucketRangeLabel', () => {
  it('describes a bounded range using shared duration formatting', () => {
    expect(bucketRangeLabel(0)).toContain('0s to 1h');
  });

  it('describes the open-ended bucket', () => {
    expect(bucketRangeLabel(7)).toContain('30d');
    expect(bucketRangeLabel(null)).toBe(NO_EXPIRY_LABEL);
  });
});

describe('countTtlBuckets', () => {
  it('always returns every bucket plus the no-expiry column', () => {
    const counts = countTtlBuckets([]);
    expect(counts).toHaveLength(TTL_BUCKETS.length + 1);
    expect(countOf(counts, NO_EXPIRY_LABEL)).toBe(0);
  });

  it('counts records by lifetime', () => {
    const counts = countTtlBuckets([
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T03:00:00.000Z' },
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-02T00:00:00.000Z' },
    ]);
    expect(countOf(counts, TTL_BUCKETS[1].label)).toBe(1);
    expect(countOf(counts, TTL_BUCKETS[4].label)).toBe(1);
  });

  it('counts gists without an expiry separately', () => {
    const counts = countTtlBuckets([
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null },
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: 'not-a-date' },
    ]);
    expect(countOf(counts, NO_EXPIRY_LABEL)).toBe(2);
  });

  it('handles an empty response', () => {
    expect(isEmptyTtlResponse(countTtlBuckets([]))).toBe(true);
    expect(isEmptyTtlResponse(countTtlBuckets([{ createdAt: null, expiresAt: null }]))).toBe(false);
  });
});

describe('mostCommonBucket', () => {
  it('returns the highest non-zero bucket', () => {
    const counts = countTtlBuckets([
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T03:00:00.000Z' },
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T04:00:00.000Z' },
      { createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-05T00:00:00.000Z' },
    ]);
    expect(mostCommonBucket(counts)?.label).toBe(TTL_BUCKETS[1].label);
  });

  it('returns null when nothing was counted', () => {
    expect(mostCommonBucket(countTtlBuckets([]))).toBeNull();
  });
});
