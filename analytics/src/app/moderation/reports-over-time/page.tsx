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
import { StatCard } from '@/components/StatCard';
import { formatCompactNumber } from '@/lib/format';
import { useEventsStats, useModerationStats } from '@/hooks';

export default function ReportsOverTimePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data: eventsData, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEventsStats(
    { from, to, bucket, type: 'gist_reported', recentLimit: 20 },
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
  const recent = eventsData?.recent ?? [];

  const chartData = buckets.map((b) => ({
    bucket: b.bucket,
    reports: b.counts.gist_reported ?? 0,
  }));

  const totalReports = chartData.reduce((sum, d) => sum + d.reports, 0);
  const avgReportsPerBucket = buckets.length > 0 ? totalReports / buckets.length : 0;
  const maxReportsInBucket = Math.max(...chartData.map((d) => d.reports), 0);

  const reportedGistsCount = modData?.reportedCount ?? 0;
  const totalReportsCount = modData?.totalReports ?? 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Reports Over Time" description="Gist reported events per bucket">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Reports Over Time" description="Gist reported events per bucket">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (chartData.length === 0 || totalReports === 0) {
    return (
      <DashboardLayout title="Reports Over Time" description="Gist reported events per bucket">
        <Card>
          <EmptyState title="No reports" description="No gist_reported events found for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reports Over Time" description="When do reports arrive? Line chart of gist_reported events per bucket">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Reports (Events)" value={totalReports.toLocaleString()} />
        <KPICard title="Avg Reports/Bucket" value={avgReportsPerBucket.toFixed(1)} />
        <KPICard title="Peak Reports/Bucket" value={maxReportsInBucket.toLocaleString()} />
        <KPICard title="Reported Gists" value={reportedGistsCount.toLocaleString()} description={`${totalReportsCount} total reports on gists`} />
      </div>

      <Card title="Reports Over Time" description="Line chart of gist_reported events per bucket" className="mb-6">
        <div className="h-80">
          <LineChart
            data={chartData}
            xKey="bucket"
            yKeys={['reports']}
            colors={['#ef4444']}
            height={300}
          />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Recent Report Events" className="h-[400px]">
          <div className="h-full overflow-y-auto">
            {recent.length === 0 ? (
              <EmptyState title="No recent reports" description="No gist_reported events in the selected range." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Ledger</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Gist ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((event, index) => (
                    <tr key={`${event.type}-${event.ledger}-${index}`} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Reported
                        </span>
                      </td>
                      <td className="p-4 align-middle font-mono text-sm">{event.ledger.toLocaleString()}</td>
                      <td className="p-4 align-middle">
                        {event.stellarGistId ? <code className="font-mono text-sm">{event.stellarGistId.slice(0, 12)}…</code> : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="p-4 align-middle">{new Date(event.observedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card title="Moderation Summary" className="h-[400px]">
          <div className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Hidden Gists" value={modData?.hiddenCount.toLocaleString() ?? '—'} />
              <StatCard label="Reported Gists" value={modData?.reportedCount.toLocaleString() ?? '—'} />
              <StatCard label="Total Reports" value={modData?.totalReports.toLocaleString() ?? '—'} />
            </div>

            {modData?.histogram && modData.histogram.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Report Count Histogram</h4>
                <div className="space-y-2">
                  {modData.histogram.map((h) => (
                    <div key={h.bucket} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-neutral-600 dark:text-neutral-400">{h.bucket} report{h.bucket !== '1' ? 's' : ''}</span>
                      <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${h.count > 0 ? Math.max(10, (h.count / (modData?.totalReports || 1)) * 100) : 0}%` }} />
                      </div>
                      <span className="w-12 text-sm font-medium text-right">{h.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modData?.topReported && modData.topReported.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Top Reported Gists</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {modData.topReported.map((gist, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                      <code className="font-mono text-sm truncate max-w-[200px]">{gist.id}</code>
                      <span className="ml-4 font-medium text-red-600 dark:text-red-400">{gist.reportCount} reports</span>
                      {gist.hidden && <span className="ml-2 text-xs text-red-600 dark:text-red-400">Hidden</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}