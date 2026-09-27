'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { EmptyState } from '@/components/EmptyState';
import { CopyButton } from '@/components/CopyButton';
import { formatCompactNumber, formatIsoToLocal, truncateAddress } from '@/lib/format';
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

export default function ContractEventsFeedPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error, refetch } = useEventsStats(
    { from, to, bucket, type: typeFilter || undefined, recentLimit: 50 },
    { refreshInterval: autoRefresh ? 30000 : 0 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const buckets = data?.buckets ?? [];
  const recent = data?.recent ?? [];

  const filteredRecent = typeFilter ? recent.filter((r) => r.type === typeFilter) : recent;

  const totalEvents = buckets.reduce((sum, b) => sum + Object.values(b.counts).reduce((a, b) => a + b, 0), 0);
  const uniqueTypes = new Set(buckets.flatMap((b) => Object.keys(b.counts).filter((k) => b.counts[k] > 0))).size;

  if (isLoading) {
    return (
      <DashboardLayout title="Contract Events Feed" description="Recent on-chain events with type filter">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Contract Events Feed" description="Recent on-chain events with type filter">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (recent.length === 0) {
    return (
      <DashboardLayout title="Contract Events Feed" description="Recent on-chain events with type filter">
        <Card>
          <EmptyState title="No events" description="No contract events found for the selected range and filter." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contract Events Feed" description="Recent on-chain events with type filter">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <RefreshControl onRefresh={handleRefresh} disabled={!autoRefresh} />
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Auto-refresh (30s)</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <KPICard title="Total Events" value={totalEvents.toLocaleString()} />
        <KPICard title="Event Types" value={uniqueTypes.toLocaleString()} />
        <KPICard title="Recent Events" value={filteredRecent.length.toLocaleString()} description={typeFilter ? `Filtered: ${EVENT_TYPE_LABELS[typeFilter]}` : 'All types'} />
      </div>

      <Card title="Recent Events" description={`Showing ${filteredRecent.length} most recent events${typeFilter ? ` (${EVENT_TYPE_LABELS[typeFilter]})` : ''}`}>
        {filteredRecent.length === 0 ? (
          <EmptyState title="No events match filter" description="Try adjusting the time range or event type filter." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead>Gist ID</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecent.map((event, index) => (
                  <TableRow key={`${event.type}-${event.ledger}-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }} />
                        <span className="font-medium text-sm">{EVENT_TYPE_LABELS[event.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{event.ledger.toLocaleString()}</TableCell>
                    <TableCell>
                      {event.stellarGistId ? (
                        <code className="font-mono text-sm">{truncateAddress(event.stellarGistId, 8, 6)}</code>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatIsoToLocal(event.observedAt)}</TableCell>
                    <TableCell>
                      {event.stellarGistId && (
                        <CopyButton value={event.stellarGistId} label="gist ID" className="w-fit" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card title="Event Summary by Bucket">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time Bucket</TableHead>
                {EVENT_TYPES.map((type) => (
                  <TableHead key={type}>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
                      <span className="text-xs">{EVENT_TYPE_LABELS[type]}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.slice(-20).map((b, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{new Date(b.bucket).toLocaleDateString()}</TableCell>
                  {EVENT_TYPES.map((type) => (
                    <TableCell key={type} className="text-right font-medium"
                      style={{ color: EVENT_TYPE_COLORS[type] }}
                    >
                      {(b.counts[type] ?? 0).toLocaleString()}
                    </TableCell>
                  ))}
                  <TableCell className="font-medium text-right">
                    {Object.values(b.counts).reduce((a, b) => a + b, 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </DashboardLayout>
  );
}