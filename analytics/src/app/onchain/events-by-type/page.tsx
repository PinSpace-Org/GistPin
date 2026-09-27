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
import { formatCompactNumber } from '@/lib/format';
import { useEventsStats } from '@/hooks';

const EVENT_TYPES = [
  'gist_posted',
  'gist_edited',
  'gist_deleted',
  'gist_hidden',
  'gist_unhidden',
  'gist_removed',
  'gist_reported',
] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  gist_posted: 'Posted',
  gist_edited: 'Edited',
  gist_deleted: 'Deleted',
  gist_hidden: 'Hidden',
  gist_unhidden: 'Unhidden',
  gist_removed: 'Removed',
  gist_reported: 'Reported',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  gist_posted: '#3b82f6',
  gist_edited: '#22c55e',
  gist_deleted: '#ef4444',
  gist_hidden: '#f59e0b',
  gist_unhidden: '#06b6d4',
  gist_removed: '#a855f7',
  gist_reported: '#ec4899',
};

export default function EventsByTypeOverTimePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(EVENT_TYPES));

  const { data, isLoading, error, refetch } = useEventsStats(
    { from, to, bucket, recentLimit: 20 },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const buckets = data?.buckets ?? [];

  const chartData = buckets.map((b) => {
    const entry: Record<string, string | number> = { label: new Date(b.bucket).toLocaleDateString() };
    for (const type of EVENT_TYPES) {
      if (visibleTypes.has(type)) {
        entry[EVENT_TYPE_LABELS[type]] = b.counts[type] ?? 0;
      }
    }
    return entry;
  });

  const valueKeys = EVENT_TYPES
    .filter((t) => visibleTypes.has(t))
    .map((t) => EVENT_TYPE_LABELS[t]);

  const colors = EVENT_TYPES
    .filter((t) => visibleTypes.has(t))
    .map((t) => EVENT_TYPE_COLORS[t]);

  const totals = EVENT_TYPES.reduce((acc, type) => {
    acc[type] = buckets.reduce((sum, b) => sum + (b.counts[type] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalEvents = Object.values(totals).reduce((a, b) => a + b, 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Events by Type Over Time" description="Contract event counts per type per time bucket">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Events by Type Over Time" description="Contract event counts per type per time bucket">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (buckets.length === 0 || totalEvents === 0) {
    return (
      <DashboardLayout title="Events by Type Over Time" description="Contract event counts per type per time bucket">
        <Card>
          <EmptyState title="No events" description="No contract events found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const toggleType = (type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  return (
    <DashboardLayout title="Events by Type Over Time" description="Contract event counts per type per time bucket">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Events" value={totalEvents.toLocaleString()} />
        <KPICard title="Active Types" value={valueKeys.length.toLocaleString()} description={EVENT_TYPES.length + ' possible'} />
        <KPICard title="Buckets" value={buckets.length.toLocaleString()} />
        <KPICard title="Top Event" value={Object.entries(totals).sort(([,a],[,b]) => b - a)[0]?.[0]?.replace('gist_', '') ?? '—'} />
      </div>

      <Card title="Events by Type Over Time" description="Stacked bar chart with legend toggle per type" className="mb-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => (
            <label key={type} className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-md text-sm font-medium transition-colors border"
              style={{
                backgroundColor: visibleTypes.has(type) ? EVENT_TYPE_COLORS[type] : 'transparent',
                color: visibleTypes.has(type) ? 'white' : 'inherit',
                borderColor: visibleTypes.has(type) ? EVENT_TYPE_COLORS[type] : 'inherit',
              }}
            >
              <input
                type="checkbox"
                checked={visibleTypes.has(type)}
                onChange={() => toggleType(type)}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{EVENT_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
        <div className="h-[450px]">
          {valueKeys.length > 0 ? (
            <BarChart
              data={chartData}
              labelKey="label"
              valueKeys={valueKeys}
              colors={colors}
              height={400}
              stacked={true}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">Select at least one event type</div>
          )}
        </div>
      </Card>

      <Card title="Event Type Totals">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Total Count</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Per Bucket Avg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EVENT_TYPES
                .filter((type) => totals[type] > 0)
                .sort((a, b) => totals[b] - totals[a])
                .map((type) => (
                  <TableRow key={type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
                        <span>{EVENT_TYPE_LABELS[type]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{totals[type].toLocaleString()}</TableCell>
                    <TableCell>{totalEvents > 0 ? ((totals[type] / totalEvents) * 100).toFixed(1) + '%' : '—'}</TableCell>
                    <TableCell>{buckets.length > 0 ? (totals[type] / buckets.length).toFixed(1) : '—'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </DashboardLayout>
  );
}