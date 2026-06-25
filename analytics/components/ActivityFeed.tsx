'use client';

import { useActivityFeed, type TimeRange, type ActivityType } from '@/hooks/useActivityFeed';

// ── Constants ────────────────────────────────────────────────────────────────

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1h',  value: '1h'  },
  { label: '6h',  value: '6h'  },
  { label: '24h', value: '24h' },
  { label: '7d',  value: '7d'  },
];

const TYPE_STYLES: Record<ActivityType, string> = {
  gist_created:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
  tip_sent:       'bg-amber-100  text-amber-700  dark:bg-amber-900/60  dark:text-amber-300',
  gist_viewed:    'bg-blue-100   text-blue-700   dark:bg-blue-900/60   dark:text-blue-300',
  user_signed_up: 'bg-green-100  text-green-700  dark:bg-green-900/60  dark:text-green-300',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60)  return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function VolumeBar({
  count,
  max,
  label,
}: {
  count: number;
  max: number;
  label: string;
}) {
  const heightPx = Math.max(4, Math.round((count / Math.max(max, 1)) * 44));
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div
        className="w-full rounded-t-sm bg-indigo-400 dark:bg-indigo-500 transition-all duration-500"
        style={{ height: heightPx }}
        title={`${label}: ${count} events`}
      />
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ActivityFeed() {
  const {
    filteredEntries,
    isLoading,
    lastRefresh,
    secondsUntilRefresh,
    timeRange,
    setTimeRange,
    volumePoints,
    totalVolume,
    refresh,
  } = useActivityFeed();

  const maxVolume = Math.max(...volumePoints.map((p) => p.count), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ffffff 0%,#eef2ff 100%)',
          borderRadius: 24,
          padding: '28px 28px 24px',
          boxShadow: '0 12px 40px rgba(15,23,42,0.07)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '5px 12px',
            background: '#6366f1',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Live Activity
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800 }}>
              Gist Activity Feed
            </h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
              Real-time gist activity across the platform. Refreshes every 30 seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
          >
            <RefreshIcon spinning={isLoading} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
          {lastRefresh && <span>Last updated {formatRelative(lastRefresh)}</span>}
          <span>
            Next refresh in{' '}
            <span className="font-semibold text-indigo-500">{secondsUntilRefresh}s</span>
          </span>
          <span className="ml-auto font-medium text-gray-600">
            {totalVolume.toLocaleString()} events in range
          </span>
        </div>
      </div>

      {/* ── Volume indicator + range filters ─────────────────────────────── */}
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Activity volume
          </p>

          {/* Time range pill buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeRange(value)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  timeRange === value
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sparkline bars */}
        <div className="flex items-end gap-1" style={{ height: 56 }}>
          {volumePoints.map((pt) => (
            <VolumeBar key={pt.label} count={pt.count} max={maxVolume} label={pt.label} />
          ))}
        </div>
      </div>

      {/* ── Scrollable feed ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {/* Sticky column headers */}
        <div
          className="grid items-center gap-4 border-b bg-gray-50 dark:bg-gray-800 px-5 py-3 sticky top-0 z-10"
          style={{ gridTemplateColumns: '1fr 1fr auto auto' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Location
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Event
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">
            When
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">
            Reactions
          </span>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
          {isLoading && filteredEntries.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Loading activity...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No activity in this time range.
            </div>
          ) : (
            filteredEntries.map((entry, i) => (
              <div
                key={entry.id}
                className={`grid items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  i < filteredEntries.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-800'
                    : ''
                }`}
                style={{ gridTemplateColumns: '1fr 1fr auto auto' }}
              >
                {/* Location cell */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-lg" aria-hidden="true">
                    {entry.location.flag}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.location.city}</p>
                    <p className="truncate text-xs text-gray-400">{entry.location.country}</p>
                  </div>
                </div>

                {/* Event type + gist title */}
                <div className="min-w-0">
                  <span
                    className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      TYPE_STYLES[entry.type]
                    }`}
                  >
                    {entry.type.replace(/_/g, ' ')}
                  </span>
                  <p className="truncate text-xs text-gray-500">{entry.gistTitle}</p>
                </div>

                {/* Timestamp */}
                <span className="whitespace-nowrap text-right text-xs text-gray-400">
                  {formatRelative(entry.timestamp)}
                </span>

                {/* Reaction count */}
                <div className="flex items-center justify-end gap-1">
                  <span aria-hidden="true">💬</span>
                  <span className="tabular-nums text-sm font-semibold">
                    {entry.reactionCount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
