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
import { useEventsStats, useModerationStats } from '@/hooks';

export default function ModerationActionMixPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data: eventsData, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEventsStats(
    { from, to, bucket, type: undefined, recentLimit: 20 },
    { refreshInterval: 30000 },
  );

  const { data: modData, isLoading: modLoading, error: modError, refetch: refetchMod } = useModerationStats(
    { limit: 10 },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetchEvents();
    refetchMod();
  };

  const isLoading = eventsLoading || modLoading;
  const error = eventsError || modError;

  const buckets = eventsData?.buckets ?? [];
  const moderationTypes = ['gist_hidden', 'gist_unhidden', 'gist_removed'];

  const chartData = buckets.map((b) => {
    const entry: Record<string, string | number> = { label: new Date(b.bucket).toLocaleDateString() };
    for (const type of moderationTypes) {
      entry[type] = b.counts[type] ?? 0;
    }
    return entry;
  });

  const totals = moderationTypes.reduce((acc, type) => {
    acc[type] = buckets.reduce((sum, b) => sum + (b.counts[type] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalModActions = Object.values(totals).reduce((a, b) => a + b, 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Moderation Action Mix" description="Moderation actions over time">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Moderation Action Mix" description="Moderation actions over time">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (buckets.length === 0 || totalModActions === 0) {
    return (
      <DashboardLayout title="Moderation Action Mix" description="Moderation actions over time">
        <Card>
          <EmptyState title="No moderation actions" description="No moderation actions found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const labelMap: Record<string, string> = {
    gist_hidden: 'Hidden',
    gist_unhidden: 'Unhidden',
    gist_removed: 'Removed',
  };

  return (
    <DashboardLayout title="Moderation Action Mix" description="Moderation actions (hide, unhide, remove) over time">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Actions" value={totalModActions.toLocaleString()} />
        <KPICard title="Hidden" value={totals.gist_hidden.toLocaleString()} />
        <KPICard title="Unhidden" value={totals.gist_unhidden.toLocaleString()} />
        <KPICard title="Removed" value={totals.gist_removed.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Moderation Actions Over Time" className="h-[450px]">
          <div className="h-full">
            <BarChart
              data={chartData}
              labelKey="label"
              valueKeys={moderationTypes}
              colors={['#ef4444', '#22c55e', '#f59e0b']}
              height={350}
              stacked={true}
            />
          </div>
        </Card>

        <Card title="Totals" description="Total moderation actions for the selected range" className="h-[450px]">
          <div className="grid gap-4 md:grid-cols-2">
            {moderationTypes.map((type) => (
              <StatCard
                key={type}
                label={labelMap[type]}
                value={totals[type].toLocaleString()}
                description={`${totalModActions > 0 ? ((totals[type] / totalModActions) * 100).toFixed(1) : '0'}% of total`}
              />
            ))}
          </div>
        </Card>
      </div>

      {modData && (
        <Card title="Moderation Summary" description="Overall moderation statistics">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Hidden Gists" value={modData.hiddenCount.toLocaleString()} />
            <StatCard label="Reported Gists" value={modData.reportedCount.toLocaleString()} />
            <StatCard label="Total Reports" value={modData.totalReports.toLocaleString()} />
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}