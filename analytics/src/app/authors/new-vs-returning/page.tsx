'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { formatCompactNumber, formatPercent } from '@/lib/format';
import { useNewVsReturningAuthors } from '@/hooks';

export default function NewVsReturningAuthorsPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [view, setView] = useState<'stacked' | 'donut'>('stacked');

  const { data, isLoading, error, refetch } = useNewVsReturningAuthors(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetch();
  };

  const buckets = data?.buckets ?? [];
  const totalNew = data?.totalNew ?? 0;
  const totalReturning = data?.totalReturning ?? 0;
  const totalAuthors = totalNew + totalReturning;

  if (isLoading) {
    return (
      <DashboardLayout title="New vs Returning Authors" description="Retention at a glance">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="New vs Returning Authors" description="Retention at a glance">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (buckets.length === 0 || totalAuthors === 0) {
    return (
      <DashboardLayout title="New vs Returning Authors" description="Retention at a glance">
        <Card>
          <EmptyState title="No data" description="No author retention data for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const chartData = buckets.map((b) => ({
    label: new Date(b.bucket).toLocaleDateString(),
    newAuthors: b.newAuthors,
    returningAuthors: b.returningAuthors,
  }));

  const donutSegments = [
    { label: 'New Authors', value: totalNew, color: '#3b82f6' },
    { label: 'Returning Authors', value: totalReturning, color: '#22c55e' },
  ].filter((s) => s.value > 0);

  const newPercentage = totalAuthors > 0 ? (totalNew / totalAuthors) * 100 : 0;
  const returningPercentage = totalAuthors > 0 ? (totalReturning / totalAuthors) * 100 : 0;

  return (
    <DashboardLayout title="New vs Returning Authors" description="Retention at a glance">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
          <div className="flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 rounded-md">
            {(['stacked', 'donut'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              >
                {v === 'stacked' ? 'Stacked Bars' : 'Donut'}
              </button>
            ))}
          </div>
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Authors" value={totalAuthors.toLocaleString()} />
        <KPICard title="New Authors" value={totalNew.toLocaleString()} description={`${newPercentage.toFixed(1)}%`} />
        <KPICard title="Returning Authors" value={totalReturning.toLocaleString()} description={`${returningPercentage.toFixed(1)}%`} />
        <KPICard title="Retention Rate" value={formatPercent(returningPercentage / 100)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="New vs Returning Over Time" className="h-[450px]">
          <div className="h-full">
            {view === 'stacked' ? (
              <BarChart
                data={chartData}
                labelKey="label"
                valueKeys={['newAuthors', 'returningAuthors']}
                colors={['#3b82f6', '#22c55e']}
                height={400}
                stacked={true}
              />
            ) : (
              <DonutChart
                segments={donutSegments}
                centerLabel="Authors"
                centerValue={totalAuthors.toLocaleString()}
                height={400}
              />
            )}
          </div>
        </Card>

        <Card title="Definitions" className="h-[450px]">
          <div className="p-4 space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                New Authors
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Authors who posted their first gist within the selected time range. These are authors with no prior gist history before the range start.
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Returning Authors
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Authors who have posted at least one gist before the selected time range and posted again within the range. These represent retained authors.
              </p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Methodology</h4>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 space-y-1 list-disc list-inside">
                <li>Only signed authors are counted (anonymous posts excluded)</li>
                <li>An author is "new" if their first gist falls within the range</li>
                <li>An author is "returning" if they have gists before the range and within it</li>
                <li>Counts are per time bucket, then aggregated for totals</li>
                <li>Retention rate = Returning Authors / Total Authors</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Bucket Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Time Bucket</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">New Authors</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Returning Authors</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Total</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400">Retention %</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => {
                const total = b.newAuthors + b.returningAuthors;
                return (
                  <tr key={i} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="p-4 align-middle">{new Date(b.bucket).toLocaleDateString()}</td>
                    <td className="p-4 align-middle font-medium text-blue-600 dark:text-blue-400">{b.newAuthors.toLocaleString()}</td>
                    <td className="p-4 align-middle font-medium text-green-600 dark:text-green-400">{b.returningAuthors.toLocaleString()}</td>
                    <td className="p-4 align-middle font-medium">{total.toLocaleString()}</td>
                    <td className="p-4 align-middle">{total > 0 ? formatPercent(b.returningAuthors / total) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}