'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type Preset = 'today' | '7d' | '30d' | 'custom';

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, 'custom'>): DateRange {
  const to = toISO(new Date());
  if (preset === 'today') return { from: to, to };
  const from = new Date();
  from.setDate(from.getDate() - (preset === '7d' ? 6 : 29));
  return { from: toISO(from), to };
}

export function useDateRange() {
  const router = useRouter();
  const params = useSearchParams();

  const [range, setRangeState] = useState<DateRange>(() => {
    const from = params.get('from');
    const to = params.get('to');
    if (from && to) return { from, to };
    return presetRange('7d');
  });

  const [preset, setPresetState] = useState<Preset>(() => {
    return (params.get('preset') as Preset) ?? '7d';
  });

  const applyPreset = useCallback((p: Preset, custom?: DateRange) => {
    const next = p === 'custom' && custom ? custom : presetRange(p as Exclude<Preset, 'custom'>);
    setPresetState(p);
    setRangeState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('preset', p);
    url.searchParams.set('from', next.from);
    url.searchParams.set('to', next.to);
    router.replace(url.pathname + url.search);
  }, [router]);

  // Sync on mount if params already present
  useEffect(() => {
    const from = params.get('from');
    const to = params.get('to');
    const p = params.get('preset') as Preset | null;
    if (from && to) setRangeState({ from, to });
    if (p) setPresetState(p);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { range, preset, applyPreset };
}
