export interface FreshnessScore {
  label: string;
  score: number;
}

export interface ContentAgeBucket {
  label: string;
  count: number;
  pct: number;
}

export function getFreshnessScores(): FreshnessScore[] {
  return [
    { label: 'Content Freshness',        score: 82 },
    { label: 'Update Frequency',         score: 68 },
    { label: 'Staleness Index',          score: 25 },
    { label: 'Recently Active Gists',    score: 76 },
    { label: 'Abandonment Rate',         score: 15 },
  ];
}

export function getAgeBuckets(): ContentAgeBucket[] {
  return [
    { label: 'Last 24 hours',  count: 420,  pct: 28 },
    { label: 'Last 7 days',    count: 510,  pct: 34 },
    { label: 'Last 30 days',   count: 320,  pct: 21 },
    { label: '30-90 days',     count: 180,  pct: 12 },
    { label: '90+ days',       count: 70,   pct: 5 },
  ];
}

export function getMonthlyTrend(): { month: string; fresh: number; stale: number }[] {
  return [
    { month: 'Jan', fresh: 320, stale: 180 },
    { month: 'Feb', fresh: 350, stale: 165 },
    { month: 'Mar', fresh: 390, stale: 150 },
    { month: 'Apr', fresh: 420, stale: 140 },
    { month: 'May', fresh: 460, stale: 130 },
    { month: 'Jun', fresh: 510, stale: 120 },
  ];
}

export function getStaleGists(): { gistId: string; title: string; lastUpdated: string; daysSinceUpdate: number }[] {
  return [
    { gistId: 'G-001', title: 'Old restaurant review',      lastUpdated: '2025-11-15', daysSinceUpdate: 222 },
    { gistId: 'G-015', title: 'Outdated transit schedule',  lastUpdated: '2026-01-20', daysSinceUpdate: 156 },
    { gistId: 'G-032', title: 'Expired event listing',      lastUpdated: '2026-02-10', daysSinceUpdate: 135 },
    { gistId: 'G-048', title: 'Stale safety alert',         lastUpdated: '2026-03-05', daysSinceUpdate: 112 },
    { gistId: 'G-055', title: 'Inactive wallet address',    lastUpdated: '2026-03-28', daysSinceUpdate: 89 },
  ];
}
