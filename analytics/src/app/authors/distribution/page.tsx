'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/charts/BarChart';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { formatCompactNumber } from '@/lib/format';
import { usePostsPerAuthorDistribution } from '@/hooks';

export default function PostsPerAuthorDistributionPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [logScale, setLogScale] = useState(false);

  const { data, isLoading, error, refetch } = usePostsPerAuthorDistribution(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const histogram = data?.histogram ?? [];
  const medianPosts = data?.medianPostsPerAuthor ?? 0;
  const totalAuthors = data?.totalAuthors ?? 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Posts-Per-Author Distribution" description="Histogram of posts per author with optional log scale">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Posts-Per-Author Distribution" description="Histogram of posts per author with optional log scale">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (histogram.length === 0) {
    return (
      <DashboardLayout title="Posts-Per-Author Distribution" description="Histogram of posts per author with optional log scale">
        <Card>
          <EmptyState title="No data" description="No author distribution data for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const chartData = histogram.map((h) => ({
    label: h.bucket,
    count: h.count,
  }));

  const maxCount = Math.max(...histogram.map((h) => h.count), 1);

  return (
    <DashboardLayout title="Posts-Per-Author Distribution" description="Histogram of posts per author with optional log scale">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={logScale}
              onChange={(e) => setLogScale(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Log Scale</span>
          </label>
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <KPICard title="Total Authors" value={totalAuthors.toLocaleString()} />
        <KPICard title="Median Posts/Author" value={medianPosts.toLocaleString()} />
        <KPICard title="Max Posts (Bucket)" value={maxCount.toLocaleString()} />
      </div>

      <Card title="Posts-Per-Author Histogram" description="Number of authors per posts bucket" className="mb-6">
        <div className="h-[450px]">
          <BarChart
            data={chartData}
            labelKey="label"
            valueKeys={['count']}
            colors={['#3b82f6']}
            height={400}
            maxBars={30}
          />
        </div>
        {logScale && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Log scale enabled: Y-axis shows logarithmic scale. This helps visualize the long tail of authors with few posts.
            </p>
          </div>
        )}
      </Card>

      <Card title="Distribution Details">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Authors"
            value={totalAuthors.toLocaleString()}
            description="Unique signed authors in range"
          />
          <StatCard
            label="Median Posts/Author"
            value={medianPosts.toLocaleString()}
            description="Half of authors have ≤ this many posts"
          />
          <StatCard
            label="Histogram Buckets"
            value={histogram.length.toLocaleString()}
            description="Number of posts-per-author buckets"
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}