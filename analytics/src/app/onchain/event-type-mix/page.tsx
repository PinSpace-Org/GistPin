'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/charts/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { formatCompactNumber, formatPercent } from '@/lib/format';
import { useEventsStats, useOverview } from '@/hooks';

const EVENT_TYPE_LABELS: Record<string, string> = {
  gist_posted: 'Gist Posted',
  gist_edited: 'Gist Edited',
  gist_deleted: 'Gist Deleted',
  gist_hidden: 'Gist Hidden',
  gist_unhidden: 'Gist Unhidden',
  gist_removed: 'Gist Removed',
  gist_reported: 'Gist Reported',
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

export default function EventTypeMixPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data: eventsData, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEventsStats(
    { from, to, bucket, recentLimit: 20 },
    { refreshInterval: 30000 },
  );

  const { data: overview, refetch: refetchOverview } = useOverview({ refreshInterval: 30000 });

  const handleRefresh = () => {
    refetchEvents();
    refetchOverview();
  };

  const isLoading = eventsLoading;
  const error = eventsError;

  const buckets = eventsData?.buckets ?? [];
  const eventTypes = Object.keys(EVENT_TYPE_LABELS);

  const totals = eventTypes.reduce((acc, type) => {
    acc[type] = buckets.reduce((sum, b) => sum + (b.counts[type] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalEvents = Object.values(totals).reduce((a, b) => a + b, 0);

  const donutSegments = eventTypes
    .filter((type) => totals[type] > 0)
    .map((type) => ({
      label: EVENT_TYPE_LABELS[type],
      value: totals[type],
      color: EVENT_TYPE_COLORS[type],
    }));

  if (isLoading) {
    return (
      <DashboardLayout title="Event Type Mix" description="Composition of contract events">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Event Type Mix" description="Composition of contract events">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (totalEvents === 0) {
    return (
      <DashboardLayout title="Event Type Mix" description="Composition of contract events">
        <Card>
          <EmptyState title="No events" description="No contract events found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Event Type Mix" description="Composition of contract events for the selected range">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Events" value={totalEvents.toLocaleString()} />
        <KPICard title="Event Types" value={donutSegments.length.toLocaleString()} description={eventTypes.length + ' possible types'} />
        <KPICard title="Top Event" value={donutSegments[0]?.label ?? '—'} description={`${donutSegments[0] ? formatPercent(donutSegments[0].value / totalEvents) : '—'} of total`} />
        <KPICard title="Signed Posts" value={overview?.signed.toLocaleString() ?? '—'} description={`${overview && overview.total > 0 ? formatPercent(overview.signed / overview.total) : '—'} of gists`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Event Type Distribution" className="h-[450px]">
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <DonutChart
                segments={donutSegments}
                centerLabel="Events"
                centerValue={totalEvents.toLocaleString()}
                height={350}
              />
            </div>
          </div>
        </Card>

        <Card title="Breakdown" description="Event counts and percentages" className="h-[450px]">
          <div className="overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTypes
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
                      <TableCell>{formatPercent(totals[type] / (totalEvents || 1))}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-medium bg-neutral-50 dark:bg-neutral-800/50">
                  <TableHead>Total</TableHead>
                  <TableHead>{totalEvents.toLocaleString()}</TableHead>
                  <TableHead>100%</TableHead>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card title="Accessible Text Alternative">
        <div className="prose text-sm text-neutral-600 dark:text-neutral-400">
          <p>Event type distribution for the selected time range:</p>
          <ul className="list-disc list-inside space-y-1">
            {eventTypes
              .filter((type) => totals[type] > 0)
              .sort((a, b) => totals[b] - totals[a])
              .map((type) => (
                <li key={type}>
                  <strong>{EVENT_TYPE_LABELS[type]}</strong>: {totals[type].toLocaleString()} ({formatPercent(totals[type] / totalEvents)})
                </li>
              ))}
          </ul>
          <p>Total events: {totalEvents.toLocaleString()}</p>
        </div>
      </Card>
    </DashboardLayout>
  );
}