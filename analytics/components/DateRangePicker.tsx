'use client';

import { useState } from 'react';
import { useDateRange, type Preset } from '@/hooks/useDateRange';

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Today',    value: 'today' },
  { label: 'Last 7 days',  value: '7d'    },
  { label: 'Last 30 days', value: '30d'   },
  { label: 'Custom',   value: 'custom' },
];

export default function DateRangePicker() {
  const { range, preset, applyPreset } = useDateRange();
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => applyPreset(p.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            preset === p.value
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          {p.label}
        </button>
      ))}

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
          <span className="text-sm text-gray-500">–</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            onClick={() => applyPreset('custom', { from: customFrom, to: customTo })}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
