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
import { formatPercent } from '@/lib/format';
import { useAuthorConcentration } from '@/hooks';

export default function AuthorConcentrationPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data, isLoading, error, refetch } = useAuthorConcentration({ refreshInterval: 30000 });

  const handleRefresh = () => {
    refetch();
  };

  const top10Share = data?.top10Share ?? 0;
  const giniCoefficient = data?.giniCoefficient ?? 0;
  const totalAuthors = data?.totalAuthors ?? 0;
  const totalGists = data?.totalGists ?? 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Author Concentration Metrics" description="Top 10 authors share and Gini coefficient">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Author Concentration Metrics" description="Top 10 authors share and Gini coefficient">
        <Card>
          <EmptyState title="Failed to load data" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (!data || totalAuthors === 0) {
    return (
      <DashboardLayout title="Author Concentration Metrics" description="Top 10 authors share and Gini coefficient">
        <Card>
          <EmptyState title="No data" description="No author data available for the selected range." />
        </Card>
      </DashboardLayout>
    );
  }

  const concentrationSegments = [
    { label: 'Top 10 Authors', value: Math.round((top10Share / 100) * totalGists), color: '#ef4444' },
    { label: 'Other Authors', value: totalGists - Math.round((top10Share / 100) * totalGists), color: '#6b7280' },
  ].filter((s) => s.value > 0);

  return (
    <DashboardLayout title="Author Concentration Metrics" description="How top-heavy is author activity?">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard
          title="Top 10 Authors Share"
          value={formatPercent(top10Share / 100)}
          description={`${totalAuthors} total authors`}
        />
        <KPICard
          title="Gini Coefficient"
          value={giniCoefficient.toFixed(3)}
          description="0 = perfect equality, 1 = maximum inequality"
        />
        <KPICard title="Total Authors" value={totalAuthors.toLocaleString()} />
        <KPICard title="Total Gists" value={totalGists.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Gist Distribution" className="h-[400px]">
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <DonutChart
                segments={concentrationSegments}
                centerLabel="Gists"
                centerValue={totalGists.toLocaleString()}
                height={300}
              />
            </div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                The top 10 authors account for <strong className="text-neutral-900 dark:text-neutral-100">{formatPercent(top10Share / 100)}</strong> of all gists.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Gini Coefficient Explanation" className="h-[400px]">
          <div className="p-4 space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{giniCoefficient.toFixed(3)}</div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Gini Coefficient</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>0.0</strong> — Perfect equality (all authors have equal posts)</p>
              <p><strong>0.0 - 0.3</strong> — Low concentration (relatively even distribution)</p>
              <p><strong>0.3 - 0.5</strong> — Moderate concentration</p>
              <p><strong>0.5 - 0.7</strong> — High concentration (top-heavy)</p>
              <p><strong>0.7 - 1.0</strong> — Very high concentration (dominated by few authors)</p>
              <p><strong>1.0</strong> — Maximum inequality (single author has all posts)</p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                The Gini coefficient measures inequality in the distribution of posts per author. 
                A higher value indicates that a small number of authors produce a disproportionate share of content.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Interpretation">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">What this means</h4>
            <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400 list-disc list-inside">
              <li>Top 10 authors produce {formatPercent(top10Share / 100)} of all gists</li>
              <li>Gini coefficient of {giniCoefficient.toFixed(3)} indicates {giniCoefficient < 0.3 ? 'low' : giniCoefficient < 0.5 ? 'moderate' : giniCoefficient < 0.7 ? 'high' : 'very high'} concentration</li>
              <li>{totalAuthors} unique authors contributed {totalGists.toLocaleString()} gists</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Methodology</h4>
            <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400 list-disc list-inside">
              <li>Signed authors only (anonymous posts excluded)</li>
              <li>Calculated from posts-per-author histogram</li>
              <li>Gini coefficient: 1 - 2 × area under Lorenz curve</li>
              <li>Top 10 share: sum of top 10 authors' posts / total posts</li>
            </ul>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}