'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface DateRangePickerProps {
  defaultFrom?: string;
  defaultTo?: string;
  className?: string;
}

const PRESET_RANGES = [
  { label: 'Last hour', value: '1h' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
] as const;

function getDateFromPreset(preset: string): { from: string; to: string } {
  const now = new Date();
  let from: Date;

  switch (preset) {
    case '1h':
      from = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return { from: from.toISOString(), to: now.toISOString() };
}

export function DateRangePicker({ defaultFrom, defaultTo, className = '' }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') ?? defaultFrom ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get('to') ?? defaultTo ?? new Date().toISOString();
  const preset = searchParams.get('preset') ?? '';

  const handlePresetChange = useCallback(
    (newPreset: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPreset) {
        params.set('preset', newPreset);
        const { from: newFrom, to: newTo } = getDateFromPreset(newPreset);
        params.set('from', newFrom);
        params.set('to', newTo);
      } else {
        params.delete('preset');
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleCustomChange = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', newFrom);
      params.set('to', newTo);
      params.delete('preset');
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const formatDateTimeLocal = (iso: string) => {
    const date = new Date(iso);
    return date.toISOString().slice(0, 16);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 rounded-md overflow-hidden">
        {PRESET_RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => handlePresetChange(range.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === range.value
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {range.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handlePresetChange('')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            !preset
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Custom
        </button>
      </div>

      {!preset && (
        <div className="flex items-center gap-1">
          <label htmlFor="from-date" className="sr-only">
            From
          </label>
          <input
            id="from-date"
            type="datetime-local"
            value={formatDateTimeLocal(from)}
            onChange={(e) => handleCustomChange(e.target.value, to)}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-neutral-400">to</span>
          <label htmlFor="to-date" className="sr-only">
            To
          </label>
          <input
            id="to-date"
            type="datetime-local"
            value={formatDateTimeLocal(to)}
            onChange={(e) => handleCustomChange(from, e.target.value)}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}