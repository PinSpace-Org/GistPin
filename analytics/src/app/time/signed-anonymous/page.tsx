'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { AreaChart } from '@/components/charts/AreaChart';
import { EmptyState } from '@/components/EmptyState';
import { useGistsTimeseries } from '@/hooks';

export default function SignedAnonymousOverTimePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data, isLoading, error, refetch } = useGistsTimeseries(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const timeseries = data ?? [];

  const totalSigned = timeseries.reduce((sum, d) => sum + d.signed, 0);
  const totalAnonymous = timeseries.reduce((sum, d) => sum + d.anonymous, 0);
  const totalGists = totalSigned + totalAnonymous;
  const signedPercentage = totalGists > 0 ? ((totalSigned / totalGists) * 100).toFixed(1) : '0';

  const latestBucket = timeseries[timeseries.length - 1];
  const currentSigned = latestBucket?.signed ?? 0;
  const currentAnonymous = latestBucket?.anonymous ?? 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Signed vs Anonymous Over Time" description="Gists created over time by author type">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Signed vs Anonymous Over Time" description="Gists created over time by author type">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (timeseries.length === 0) {
    return (
      <DashboardLayout title="Signed vs Anonymous Over Time" description="Gists created over time by author type">
        <Card>
          <EmptyState title="No data" description="No gist activity found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const chartData = timeseries.map((d) => ({
    bucket: d.bucket,
    signed: d.signed,
    anonymous: d.anonymous,
  }));

  return (
    <DashboardLayout title="Signed vs Anonymous Over Time" description="Gists created over time by author type">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Signed" value={totalSigned.toLocaleString()} description={`${signedPercentage}% of all gists`} />
        <KPICard title="Total Anonymous" value={totalAnonymous.toLocaleString()} description={`${(100 - parseFloat(signedPercentage)).toFixed(1)}% of all gists`} />
        <KPICard title="Current Signed" value={currentSigned.toLocaleString()} />
        <KPICard title="Current Anonymous" value={currentAnonymous.toLocaleString()} />
      </div>

      <Card title="Signed vs Anonymous Over Time" description="Stacked area chart showing the breakdown of gists by author type">
        <div className="h-80">
          <AreaChart
            data={chartData}
            xKey="bucket"
            yKeys={['signed', 'anonymous']}
            colors={['#3b82f6', '#6b7280']}
            height={300}
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}