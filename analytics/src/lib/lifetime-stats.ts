import { formatDuration, formatPercent } from './format';

export interface LifetimeRecord {
  createdAt: string | null | undefined;
  expiresAt: string | null | undefined;
}

export interface LifetimeStats {
  total: number;
  withExpiry: number;
  expired: number;
  averageSeconds: number | null;
  medianSeconds: number | null;
  expiredShare: number | null;
}

export interface LifetimeCard {
  key: 'average' | 'median' | 'expiredShare';
  label: string;
  value: string;
  tooltip: string;
}

function timeOf(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function median(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function computeLifetimeStats(
  records: ReadonlyArray<LifetimeRecord>,
  now: Date = new Date(),
): LifetimeStats {
  const nowMs = now.getTime();
  const durations: number[] = [];
  let withExpiry = 0;
  let expired = 0;

  for (const record of records) {
    const created = timeOf(record?.createdAt);
    const expires = timeOf(record?.expiresAt);
    if (created === null) continue;
    if (expires === null) continue;
    withExpiry += 1;
    if (expires <= nowMs) expired += 1;
    if (expires > created) durations.push((expires - created) / 1000);
  }

  const averageSeconds =
    durations.length > 0
      ? durations.reduce((total, value) => total + value, 0) / durations.length
      : null;

  return {
    total: records.length,
    withExpiry,
    expired,
    averageSeconds,
    medianSeconds: median(durations),
    expiredShare: records.length > 0 ? expired / records.length : null,
  };
}

export function lifetimeCards(stats: LifetimeStats): LifetimeCard[] {
  return [
    {
      key: 'average',
      label: 'Average lifetime',
      value: formatDuration(stats.averageSeconds),
      tooltip: 'Mean time between a gist being created and its expiry time.',
    },
    {
      key: 'median',
      label: 'Median lifetime',
      value: formatDuration(stats.medianSeconds),
      tooltip: 'Middle lifetime across gists that have an expiry set.',
    },
    {
      key: 'expiredShare',
      label: 'Expired share',
      value: formatPercent(stats.expiredShare),
      tooltip: 'Share of loaded gists whose expiry time has already passed.',
    },
  ];
}
