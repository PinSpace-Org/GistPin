import { formatDuration } from './format';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const NO_EXPIRY_LABEL = 'No expiry';

export interface TtlBucket {
  label: string;
  minMs: number;
  maxMs: number | null;
}

export const TTL_BUCKETS: readonly TtlBucket[] = [
  { label: 'Under 1 hour', minMs: 0, maxMs: HOUR_MS },
  { label: '1 to 6 hours', minMs: HOUR_MS, maxMs: 6 * HOUR_MS },
  { label: '6 to 12 hours', minMs: 6 * HOUR_MS, maxMs: 12 * HOUR_MS },
  { label: '12 to 24 hours', minMs: 12 * HOUR_MS, maxMs: DAY_MS },
  { label: '1 to 3 days', minMs: DAY_MS, maxMs: 3 * DAY_MS },
  { label: '3 to 7 days', minMs: 3 * DAY_MS, maxMs: 7 * DAY_MS },
  { label: '7 to 30 days', minMs: 7 * DAY_MS, maxMs: 30 * DAY_MS },
  { label: 'Over 30 days', minMs: 30 * DAY_MS, maxMs: null },
];

export interface TtlRecord {
  createdAt: string | null | undefined;
  expiresAt: string | null | undefined;
}

export interface TtlBucketCounts {
  label: string;
  count: number;
}

function timeOf(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function bucketIndexForMs(durationMs: number | null | undefined): number | null {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs) || durationMs < 0) return null;
  for (let i = 0; i < TTL_BUCKETS.length; i++) {
    const bucket = TTL_BUCKETS[i];
    if (durationMs < bucket.minMs) continue;
    if (bucket.maxMs !== null && durationMs >= bucket.maxMs) continue;
    return i;
  }
  return null;
}

export function bucketLabel(index: number | null | undefined): string {
  if (typeof index !== 'number' || Number.isNaN(index)) return NO_EXPIRY_LABEL;
  return TTL_BUCKETS[index]?.label ?? NO_EXPIRY_LABEL;
}

export function bucketRangeLabel(index: number | null | undefined): string {
  const bucket = typeof index === 'number' ? TTL_BUCKETS[index] : undefined;
  if (bucket === undefined) return NO_EXPIRY_LABEL;
  if (bucket.maxMs === null) return `${bucket.label} (${formatDuration(bucket.minMs / 1000)}+)`;
  return `${bucket.label} (${formatDuration(bucket.minMs / 1000)} to ${formatDuration(
    bucket.maxMs / 1000,
  )})`;
}

export function countTtlBuckets(records: ReadonlyArray<TtlRecord>): TtlBucketCounts[] {
  const counts = new Map<string, number>();
  for (const label of TTL_BUCKETS.map((bucket) => bucket.label)) counts.set(label, 0);
  counts.set(NO_EXPIRY_LABEL, 0);

  for (const record of records) {
    const created = timeOf(record?.createdAt);
    const expires = timeOf(record?.expiresAt);
    const duration = created !== null && expires !== null ? expires - created : null;
    const label = bucketLabel(bucketIndexForMs(duration));
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export function mostCommonBucket(
  counts: ReadonlyArray<TtlBucketCounts>,
): TtlBucketCounts | null {
  let best: TtlBucketCounts | null = null;
  for (const entry of counts) {
    if (entry.count <= 0) continue;
    if (best === null || entry.count > best.count) best = entry;
  }
  return best;
}

export function isEmptyTtlResponse(counts: ReadonlyArray<TtlBucketCounts>): boolean {
  return counts.every((entry) => entry.count === 0);
}
