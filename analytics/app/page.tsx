'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import KPIGrid from '@/components/KPICard';
import LiveGistCounter from '@/components/LiveGistCounter';
import ChartSkeleton from '@/components/ui/ChartSkeleton';
import ChartErrorBoundary from '@/components/ui/ChartErrorBoundary';
import { AnomalyBadge, AnomalySidebar } from '@/components/ui/AnomalyAlerts';
import { DataQualityBadge } from '@/components/ui/DataQualityBadge';
import AnnotatedChart from '@/components/ui/AnnotatedChart';
import ChartExportCard from '@/components/ui/ChartExportCard';
import ExcelExportButton from '@/components/ui/ExcelExportButton';
import JsonExportControls from '@/components/ui/JsonExportControls';
import { detectAnomalies } from '@/lib/anomaly';
import { createUserActivityData } from '@/lib/analytics-data';

/** Wraps children in a horizontally swipeable container for touch devices. */
function SwipeableChart({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  return (
    <div
      ref={ref}
      className="w-full touch-pan-x overflow-x-auto"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchMove={(e) => {
        if (!ref.current) return;
        ref.current.scrollLeft -= e.touches[0].clientX - startX.current;
        startX.current = e.touches[0].clientX;
      }}
    >
      <div className="min-w-[320px]">{children}</div>
    </div>
  );
}

// Priority 2: simple charts
const LazyDailyGistsChart = dynamic(() => import('@/components/charts/DailyGistsChart'), {
  loading: () => <ChartSkeleton />,
});
const LazyUserAreaChart = dynamic(() => import('@/components/charts/UserAreaChart'), {
  loading: () => <ChartSkeleton />,
});

// Priority 3: complex visualizations
const LazyScatterChart = dynamic(() => import('@/components/charts/ScatterChart'), {
  loading: () => <ChartSkeleton />,
});
const LazyRadarChart = dynamic(() => import('@/components/charts/RadarChart'), {
  loading: () => <ChartSkeleton />,
});
const LazyCategoryPieChart = dynamic(() => import('@/components/charts/CategoryPieChart'), {
  loading: () => <ChartSkeleton />,
});
const LazyLocationTable = dynamic(() => import('@/components/ui/LocationTable'), {
  loading: () => <ChartSkeleton />,
});

// Progressive loading stages: 0 = KPIs only, 1 = simple charts, 2 = complex charts
function useProgressiveLoad() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return stage;
}

export default function Page() {
  const stage = useProgressiveLoad();
  const activityData = useMemo(() => createUserActivityData(90), []);
  const anomalies = useMemo(
    () => [
      ...detectAnomalies('New Users', activityData.labels, activityData.newUsers),
      ...detectAnomalies('Returning Users', activityData.labels, activityData.returning),
    ],
    [activityData],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Analytics Exports
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Download workbook and JSON snapshots
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Export the current analytics dataset, capture chart screenshots, or open the
              drag-and-drop report builder to compose a shareable custom layout.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <JsonExportControls />
              <ExcelExportButton />
            </div>
            <Link
              href="/custom-reports"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Open Custom Report Builder
            </Link>
          </div>
        </div>
      </div>

      {/* Priority 1: KPI row — shown immediately */}
      <KPIGrid />

      {/* Priority 2: Live counter + User area chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Live Gists
          </h2>
          <LiveGistCounter />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              New vs Returning Users · 90 days
            </h2>
            <AnomalyBadge anomalies={anomalies} chartId="New Users" />
            <AnomalyBadge anomalies={anomalies} chartId="Returning Users" />
            <DataQualityBadge labels={activityData.labels} values={activityData.newUsers} metricName="New Users" />
          </div>
          {stage >= 1 ? (
            <SwipeableChart>
              <ChartExportCard title="New vs Returning Users">
                <AnnotatedChart chartId="user-area" labels={activityData.labels}>
                  <ChartErrorBoundary title="New vs Returning Users">
                    <LazyUserAreaChart />
                  </ChartErrorBoundary>
                </AnnotatedChart>
              </ChartExportCard>
            </SwipeableChart>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </div>

      {/* Priority 2: Daily gists */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Daily Gists · Last 30 Days
        </h2>
        {stage >= 1 ? (
          <SwipeableChart>
            <ChartErrorBoundary title="Daily Gists">
              <LazyDailyGistsChart />
            </ChartErrorBoundary>
          </SwipeableChart>
        ) : (
          <ChartSkeleton />
        )}
      </div>

      {/* Priority 3: Complex charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Gist Age vs Engagement
          </h2>
          {stage >= 2 ? (
            <SwipeableChart>
              <ChartErrorBoundary title="Scatter">
                <LazyScatterChart />
              </ChartErrorBoundary>
            </SwipeableChart>
          ) : (
            <ChartSkeleton />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Platform Usage
          </h2>
          {stage >= 2 ? (
            <SwipeableChart>
              <ChartErrorBoundary title="Radar">
                <LazyRadarChart />
              </ChartErrorBoundary>
            </SwipeableChart>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </div>

      {/* Priority 3: Bottom row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Category Distribution
          </h2>
          {stage >= 2 ? (
            <SwipeableChart>
              <ChartErrorBoundary title="Category Distribution">
                <LazyCategoryPieChart />
              </ChartErrorBoundary>
            </SwipeableChart>
          ) : (
            <ChartSkeleton />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Active Locations
          </h2>
          {stage >= 2 ? (
            <SwipeableChart>
              <ChartErrorBoundary title="Locations">
                <LazyLocationTable />
              </ChartErrorBoundary>
            </SwipeableChart>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </div>

      <AnomalySidebar anomalies={anomalies} />
    </div>
  );
}
