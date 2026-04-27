/**
 * Standalone mock data generators (issue #215).
 * Re-exports the mock functions used by api.ts so they can be imported
 * independently for tests and Storybook.
 */

import type {
  GistStats,
  LocationData,
  UserGrowthData,
  UserGrowthPoint,
  CategoryDistribution,
  PlatformUsage,
  ScatterPoint,
  ScatterCategory,
} from '@/types/analytics';

const LOCATIONS = ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Enugu', 'Kaduna'];
const SCATTER_CATEGORIES: ScatterCategory[] = ['Tech', 'Finance', 'AI', 'Web3'];

export function mockLocationData(): LocationData[] {
  return LOCATIONS.map((location, i) => {
    const base = 60 - i * 7;
    const trend = Array.from({ length: 7 }, (_, d) =>
      Math.max(0, Math.round(base + d * (i % 2 === 0 ? 3 : -3) + d * 2)),
    );
    return { location, count: trend.reduce((s, v) => s + v, 0), trend };
  });
}

export function mockGistStats(): GistStats {
  return { totalGists: 1247, todayGists: 89, activeUsers: 324, topLocations: mockLocationData() };
}

export function mockUserGrowth(days = 90): UserGrowthData {
  const base = Date.now() - (days - 1) * 86_400_000;
  const result: UserGrowthPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base + i * 86_400_000);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const spike = i > 38 && i < 52 ? 40 : 0;
    result.push({
      date: label,
      returning: Math.round(Math.max(0, 120 + i * 0.8 - (isWeekend ? 25 : 0))),
      newUsers: Math.round(Math.max(0, 60 + i * 0.4 + spike)),
    });
  }
  return { days: result };
}

export function mockCategoryDistribution(): CategoryDistribution {
  const raw: [string, number][] = [
    ['Events', 312], ['Food', 278], ['Safety', 195], ['Tips', 241],
    ['News', 183], ['Transit', 157], ['Markets', 134], ['Other', 98],
  ];
  const categories = raw.map(([label, count]) => ({ label, count })) as CategoryDistribution['categories'];
  return { categories, total: categories.reduce((s, c) => s + c.count, 0) };
}

export function mockPlatformUsage(): PlatformUsage {
  return {
    metrics: [
      { label: 'Mobile',      thisMonth: 80, lastMonth: 60 },
      { label: 'Desktop',     thisMonth: 60, lastMonth: 50 },
      { label: 'API',         thisMonth: 70, lastMonth: 60 },
      { label: 'Web',         thisMonth: 90, lastMonth: 70 },
      { label: 'New Users',   thisMonth: 50, lastMonth: 40 },
      { label: 'Power Users', thisMonth: 40, lastMonth: 30 },
    ],
  };
}

export function mockScatterData(count = 500): ScatterPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `gist-${i}`,
    age: Math.floor(Math.random() * 365),
    engagement: Math.floor(Math.random() * 1000),
    category: SCATTER_CATEGORIES[Math.floor(Math.random() * SCATTER_CATEGORIES.length)],
  }));
}
