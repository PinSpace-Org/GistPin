export interface BenchmarkMetric {
  label: string;
  gistpin: number;
  industry: number;
  unit: string;
  higherIsBetter: boolean;
}

export interface BenchmarkResult {
  metrics: BenchmarkMetric[];
  overall: number;
  comparisonPeriod: string;
}

export function getBenchmarkData(
  category: 'general' | 'engagement' | 'quality' | 'growth' = 'general',
): BenchmarkResult {
  const all: Record<string, BenchmarkMetric[]> = {
    general: [
      { label: 'Uptime',            gistpin: 99.97, industry: 99.8,  unit: '%',    higherIsBetter: true  },
      { label: 'Avg Response Time', gistpin: 62,    industry: 85,    unit: 'ms',   higherIsBetter: false },
      { label: 'Error Rate',        gistpin: 0.27,  industry: 0.5,   unit: '%',    higherIsBetter: false },
      { label: 'Requests / Day',    gistpin: 125000, industry: 89000, unit: '',    higherIsBetter: true  },
      { label: 'P99 Latency',       gistpin: 195,   industry: 250,   unit: 'ms',   higherIsBetter: false },
    ],
    engagement: [
      { label: 'Daily Active Users',   gistpin: 14200, industry: 9800,  unit: '',    higherIsBetter: true  },
      { label: 'Session Duration',     gistpin: 8.4,   industry: 5.2,   unit: 'min', higherIsBetter: true  },
      { label: 'Actions / Session',    gistpin: 4.7,   industry: 3.1,   unit: '',    higherIsBetter: true  },
      { label: 'Bounce Rate',          gistpin: 32,    industry: 45,    unit: '%',   higherIsBetter: false },
      { label: 'Return Rate',          gistpin: 68,    industry: 52,    unit: '%',   higherIsBetter: true  },
    ],
    quality: [
      { label: 'Content Approval Rate',  gistpin: 94,  industry: 87,   unit: '%',   higherIsBetter: true },
      { label: 'Spam Detected',          gistpin: 3.2, industry: 7.8,  unit: '%',   higherIsBetter: false },
      { label: 'Avg Content Score',      gistpin: 8.6, industry: 6.9,  unit: '/10', higherIsBetter: true },
      { label: 'Flag Rate',              gistpin: 2.1, industry: 4.5,  unit: '%',   higherIsBetter: false },
    ],
    growth: [
      { label: 'MoM User Growth',    gistpin: 12.4, industry: 6.8,  unit: '%',   higherIsBetter: true },
      { label: 'MoM Content Growth', gistpin: 18.2, industry: 9.5,  unit: '%',   higherIsBetter: true },
      { label: 'Retention (D1)',     gistpin: 58,   industry: 42,   unit: '%',   higherIsBetter: true },
      { label: 'Retention (D7)',     gistpin: 34,   industry: 22,   unit: '%',   higherIsBetter: true },
      { label: 'Retention (D30)',    gistpin: 18,   industry: 10,   unit: '%',   higherIsBetter: true },
    ],
  };

  return {
    metrics: all[category],
    overall: 62,
    comparisonPeriod: 'Q2 2026 vs Industry Q2 2026',
  };
}

export function getCategories(): string[] {
  return ['general', 'engagement', 'quality', 'growth'];
}
