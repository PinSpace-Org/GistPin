'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { LineChart } from '@/components/charts/LineChart';
import { EmptyState } from '@/components/EmptyState';
import { useAuthorsTimeseries } from '@/hooks';

export default function UniqueAuthorsOverTimePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data, isLoading, error, refetch } = useAuthorsTimeseries(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const buckets = data?.buckets ?? [];
  const latestCount = buckets.length > 0 ? buckets[buckets.length - 1].uniqueAuthors : 0;
  const totalUniqueAuthors = Math.max(...buckets.map((b) => b.uniqueAuthors), 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Unique Authors Over Time" description="Active authors per time bucket">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Unique Authors Over Time" description="Active authors per time bucket">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (buckets.length === 0) {
    return (
      <DashboardLayout title="Unique Authors Over Time" description="Active authors per time bucket">
        <Card>
          <EmptyState title="No data" description="No author activity found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const chartData = buckets.map((b) => ({
    bucket: b.bucket,
    uniqueAuthors: b.uniqueAuthors,
  }));

  return (
    <DashboardLayout title="Unique Authors Over Time" description="Active authors per time bucket (signed authors only)">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <KPICard title="Current Unique Authors" value={latestCount.toLocaleString()} />
        <KPICard title="Peak Unique Authors" value={totalUniqueAuthors.toLocaleString()} />
      </div>

      <Card title="Unique Authors Over Time">
        <div className="h-80">
          <LineChart
            data={chartData}
            xKey="bucket"
            yKeys={['uniqueAuthors']}
            colors={['#3b82f6']}
            height={300}
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}