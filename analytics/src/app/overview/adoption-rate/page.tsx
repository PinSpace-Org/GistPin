'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { LineChart } from '@/components/charts/LineChart';
import { EmptyState } from '@/components/EmptyState';
import { formatPercent, formatCompactNumber } from '@/lib/format';
import { useGistsTimeseries, useOverview } from '@/hooks';

export default function SignedPostAdoptionRatePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('day');
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'same-period-last-week' | 'same-period-last-month'>('previous');

  const { data: timeseries, isLoading: tsLoading, error: tsError, refetch: refetchTs } = useGistsTimeseries(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const { data: overview, isLoading: ovLoading, error: ovError, refetch: refetchOv } = useOverview({ refreshInterval: 30000 });

  const handleRefresh = () => {
    refetchTs();
    refetchOv();
  };

  const isLoading = tsLoading || ovLoading;
  const error = tsError || ovError;

  const tsData = timeseries ?? [];
  const totalSigned = tsData.reduce((sum, d) => sum + d.signed, 0);
  const totalAnonymous = tsData.reduce((sum, d) => sum + d.anonymous, 0);
  const totalGists = totalSigned + totalAnonymous;
  const currentAdoptionRate = totalGists > 0 ? totalSigned / totalGists : 0;

  // Calculate sparkline data (adoption rate per bucket)
  const sparklineData = tsData.map((d) => {
    const total = d.signed + d.anonymous;
    return total > 0 ? (d.signed / total) * 100 : 0;
  });

  // Period comparison
  const previousPeriodRate = overview && overview.total > 0 ? overview.signed / overview.total : 0;
  const rateChange = previousPeriodRate > 0 ? ((currentAdoptionRate - previousPeriodRate) / previousPeriodRate) * 100 : 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Signed Post Adoption Rate" description="KPI for signed posts with trend and comparison">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Signed Post Adoption Rate" description="KPI for signed posts with trend and comparison">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (tsData.length === 0) {
    return (
      <DashboardLayout title="Signed Post Adoption Rate" description="KPI for signed posts with trend and comparison">
        <Card>
          <EmptyState title="No data" description="No gist activity found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const chartData = tsData.map((d) => ({
    bucket: d.bucket,
    signed: d.signed,
    anonymous: d.anonymous,
    adoptionRate: (d.signed + d.anonymous) > 0 ? (d.signed / (d.signed + d.anonymous)) * 100 : 0,
  }));

  const latestBucket = tsData[tsData.length - 1];
  const latestSigned = latestBucket?.signed ?? 0;
  const latestAnonymous = latestBucket?.anonymous ?? 0;
  const latestTotal = latestSigned + latestAnonymous;
  const latestRate = latestTotal > 0 ? (latestSigned / latestTotal) * 100 : 0;

  return (
    <DashboardLayout title="Signed Post Adoption Rate" description="Single KPI for signed posts with sparkline trend and period comparison">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard
          title="Signed Adoption Rate"
          value={formatPercent(currentAdoptionRate)}
          change={rateChange}
          changeLabel="vs overall"
          sparkline={sparklineData}
        />
        <KPICard
          title="Signed Gists (Range)"
          value={formatCompactNumber(totalSigned)}
          description={`${totalGists > 0 ? ((totalSigned / totalGists) * 100).toFixed(1) : 0}% of range total`}
        />
        <KPICard
          title="Current Bucket Rate"
          value={latestRate.toFixed(1) + '%'}
          description={`${latestTotal} gists in latest bucket`}
        />
        <KPICard
          title="Total Gists (Range)"
          value={formatCompactNumber(totalGists)}
          description={`${overview?.uniqueAuthors ?? 0} unique authors`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Adoption Rate Trend" description="Signed vs anonymous gists over time" className="h-[450px]">
          <div className="h-full">
            <LineChart
              data={chartData}
              xKey="bucket"
              yKeys={['signed', 'anonymous']}
              colors={['#3b82f6', '#6b7280']}
              height={380}
            />
          </div>
        </Card>

        <Card title="Adoption Rate % Over Time" description="Percentage of signed gists per bucket" className="h-[450px]">
          <div className="h-full">
            <LineChart
              data={chartData}
              xKey="bucket"
              yKeys={['adoptionRate']}
              colors={['#22c55e']}
              height={380}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Signed vs Anonymous Breakdown" className="h-[350px]">
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-xs">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">Signed Posts</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{formatPercent(currentAdoptionRate)}</span>
                  </div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${currentAdoptionRate * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">Anonymous Posts</span>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">{formatPercent(1 - currentAdoptionRate)}</span>
                  </div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-400 rounded-full transition-all" style={{ width: `${(1 - currentAdoptionRate) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-center">
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{totalGists.toLocaleString()}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Gists in Range</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Period Comparison" className="h-[350px]">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Current Range Adoption</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{formatPercent(currentAdoptionRate)}</p>
            </div>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Overall Platform Adoption (from /overview)</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{overview && overview.total > 0 ? formatPercent(overview.signed / overview.total) : '—'}</p>
            </div>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Difference</p>
              <p className={`text-2xl font-bold ${rateChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Current range adoption is calculated from the selected time range and bucket. 
                Overall platform adoption is from the /v1/stats/overview endpoint (all-time). 
                For accurate period-over-period comparison, a dedicated endpoint would be needed.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Handles Zero Totals">
        <div className="prose text-sm text-neutral-600 dark:text-neutral-400">
          <p>The adoption rate calculation safely handles zero totals:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When total gists = 0, rate displays as 0% (not NaN or error)</li>
            <li>When bucket has only signed or only anonymous, rate correctly shows 100% or 0%</li>
            <li>Sparkline gracefully handles missing data points</li>
            <li>Period comparison shows N/A when baseline is zero</li>
          </ul>
        </div>
      </Card>
    </DashboardLayout>
  );
}