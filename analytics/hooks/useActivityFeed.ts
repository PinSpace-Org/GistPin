'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimeRange = '1h' | '6h' | '24h' | '7d';

export type ActivityType =
  | 'gist_created'
  | 'tip_sent'
  | 'gist_viewed'
  | 'user_signed_up';

export interface ActivityLocation {
  city: string;
  country: string;
  flag: string;
}

export interface ActivityEntry {
  id: string;
  location: ActivityLocation;
  gistTitle: string;
  type: ActivityType;
  timestamp: Date;
  reactionCount: number;
}

export interface VolumePoint {
  label: string;
  count: number;
}

export interface UseActivityFeedReturn {
  filteredEntries: ActivityEntry[];
  isLoading: boolean;
  lastRefresh: Date | null;
  secondsUntilRefresh: number;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  volumePoints: VolumePoint[];
  totalVolume: number;
  refresh: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_S = 30;

const LOCATIONS: ActivityLocation[] = [
  { city: 'Lagos',         country: 'Nigeria',    flag: '🇳🇬' },
  { city: 'San Francisco', country: 'US',         flag: '🇺🇸' },
  { city: 'Berlin',        country: 'Germany',    flag: '🇩🇪' },
  { city: 'Tokyo',         country: 'Japan',      flag: '🇯🇵' },
  { city: 'London',        country: 'UK',         flag: '🇬🇧' },
  { city: 'São Paulo',     country: 'Brazil',     flag: '🇧🇷' },
  { city: 'Mumbai',        country: 'India',      flag: '🇮🇳' },
  { city: 'Sydney',        country: 'Australia',  flag: '🇦🇺' },
  { city: 'Toronto',       country: 'Canada',     flag: '🇨🇦' },
  { city: 'Nairobi',       country: 'Kenya',      flag: '🇰🇪' },
  { city: 'Amsterdam',     country: 'Netherlands',flag: '🇳🇱' },
  { city: 'Seoul',         country: 'South Korea',flag: '🇰🇷' },
];

const GIST_TITLES = [
  'Best ramen spots downtown',
  'Hidden bookshops in the old quarter',
  'Weekend hiking trails',
  'Rooftop bars with city views',
  'Local coffee scene',
  'Street food tour stops',
  'Vintage record stores',
  'Early morning farmers market',
  'Quiet reading nooks',
  'Live music venues',
  'Sunset viewpoints',
  'Late-night eats guide',
];

const ACTIVITY_TYPES: ActivityType[] = [
  'gist_created',
  'tip_sent',
  'gist_viewed',
  'user_signed_up',
];

const RANGE_CONFIG: Record<
  TimeRange,
  { windowMs: number; seedCount: number; buckets: number; bucketLabel: string }
> = {
  '1h':  { windowMs: 60 * 60 * 1000,          seedCount: 40,  buckets: 6, bucketLabel: '10m' },
  '6h':  { windowMs: 6 * 60 * 60 * 1000,      seedCount: 100, buckets: 6, bucketLabel: '1h'  },
  '24h': { windowMs: 24 * 60 * 60 * 1000,     seedCount: 180, buckets: 8, bucketLabel: '3h'  },
  '7d':  { windowMs: 7 * 24 * 60 * 60 * 1000, seedCount: 350, buckets: 7, bucketLabel: 'day' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function generateEntries(windowMs: number, count: number): ActivityEntry[] {
  return Array.from({ length: count }, (_, i): ActivityEntry => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
    location: pick(LOCATIONS),
    gistTitle: pick(GIST_TITLES),
    type: pick(ACTIVITY_TYPES),
    timestamp: new Date(Date.now() - rand(0, windowMs)),
    reactionCount: rand(0, 48),
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function buildVolumePoints(
  entries: ActivityEntry[],
  range: TimeRange,
): VolumePoint[] {
  const { windowMs, buckets, bucketLabel } = RANGE_CONFIG[range];
  const bucketMs = windowMs / buckets;
  const now = Date.now();

  return Array.from({ length: buckets }, (_, i) => {
    const start = now - windowMs + i * bucketMs;
    const end = start + bucketMs;
    const count = entries.filter(
      (e) => e.timestamp.getTime() >= start && e.timestamp.getTime() < end,
    ).length;
    return { label: `${i + 1}${bucketLabel}`, count };
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useActivityFeed(): UseActivityFeedReturn {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [allEntries, setAllEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_S);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    // Simulate async API latency
    const timer = setTimeout(() => {
      const { windowMs, seedCount } = RANGE_CONFIG['7d']; // fetch max window; filter client-side
      setAllEntries(generateEntries(windowMs, seedCount));
      setLastRefresh(new Date());
      setSecondsUntilRefresh(REFRESH_INTERVAL_S);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_S * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown ticker, resets whenever lastRefresh changes
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsUntilRefresh((s) => (s > 1 ? s - 1 : REFRESH_INTERVAL_S));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  // Client-side time range filter
  const cutoff = Date.now() - RANGE_CONFIG[timeRange].windowMs;
  const filteredEntries = allEntries.filter(
    (e) => e.timestamp.getTime() >= cutoff,
  );

  return {
    filteredEntries,
    isLoading,
    lastRefresh,
    secondsUntilRefresh,
    timeRange,
    setTimeRange,
    volumePoints: buildVolumePoints(filteredEntries, timeRange),
    totalVolume: filteredEntries.length,
    refresh: fetchData,
  };
}
