import type {
  GistStats,
  LocationData,
  UserGrowthData,
  CategoryDistribution,
  PlatformUsage,
  ScatterPoint,
  ApiResult,
} from '@/types/analytics';
import { processLargeDataset } from '@/lib/compression';
import {
  mockGistStats,
  mockUserGrowth,
  mockCategoryDistribution,
  mockPlatformUsage,
  mockScatterData,
  mockLocationData,
} from '@/lib/mock-data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const isMock = !API_BASE || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

async function apiFetch<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return { ok: false, error: res.statusText, status: res.status };
    const data: T = await res.json();
    const { value, compressionInfo } = await processLargeDataset(data);
    if (compressionInfo) console.debug(`[api] ${path} — ${compressionInfo}`);
    return { ok: true, data: value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function fetchGistStats(): Promise<GistStats> {
  if (isMock) return mockGistStats();
  const result = await apiFetch<GistStats>('/analytics/gists/stats');
  if (!result.ok) { console.error('[api] fetchGistStats failed:', result.error); return mockGistStats(); }
  return result.data;
}

export async function fetchUserGrowth(days = 90): Promise<UserGrowthData> {
  if (isMock) return mockUserGrowth(days);
  const result = await apiFetch<UserGrowthData>(`/analytics/users/growth?days=${days}`);
  if (!result.ok) { console.error('[api] fetchUserGrowth failed:', result.error); return mockUserGrowth(days); }
  return result.data;
}

export async function fetchCategoryDistribution(): Promise<CategoryDistribution> {
  if (isMock) return mockCategoryDistribution();
  const result = await apiFetch<CategoryDistribution>('/analytics/gists/by-category');
  if (!result.ok) { console.error('[api] fetchCategoryDistribution failed:', result.error); return mockCategoryDistribution(); }
  return result.data;
}

export async function fetchPlatformUsage(): Promise<PlatformUsage> {
  if (isMock) return mockPlatformUsage();
  const result = await apiFetch<PlatformUsage>('/analytics/platform/usage');
  if (!result.ok) { console.error('[api] fetchPlatformUsage failed:', result.error); return mockPlatformUsage(); }
  return result.data;
}

export async function fetchScatterData(count = 500): Promise<ScatterPoint[]> {
  if (isMock) return mockScatterData(count);
  const result = await apiFetch<ScatterPoint[]>(`/analytics/gists/scatter?limit=${count}`);
  if (!result.ok) { console.error('[api] fetchScatterData failed:', result.error); return mockScatterData(count); }
  return result.data;
}

export async function fetchLocationData(): Promise<LocationData[]> {
  if (isMock) return mockLocationData();
  const result = await apiFetch<LocationData[]>('/analytics/locations/active');
  if (!result.ok) { console.error('[api] fetchLocationData failed:', result.error); return mockLocationData(); }
  return result.data;
}

// Progressive loading — KPIs first, simple charts second, complex last
export const progressiveFetchers = {
  kpis: () => fetchGistStats(),
  simple: () => Promise.all([fetchCategoryDistribution(), fetchPlatformUsage()]),
  complex: () => Promise.all([fetchUserGrowth(), fetchScatterData(), fetchLocationData()]),
} as const;
