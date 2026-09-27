'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useOverview, useGistsTimeseries } from '@/hooks';

export default function OverviewPage() {
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useOverview({
    refreshInterval: 30000,
  });

  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { data: timeseries, isLoading: tsLoading, error: tsError } = useGistsTimeseries(
    { from, to, bucket },
    { refreshInterval: 30000 },
  );

  const handleRefresh = () => {
    refetchOverview();
  };

  const totalGists = overview?.total ?? 0;
  const activeGists = overview?.active ?? 0;
  const hiddenGists = overview?.hidden ?? 0;
  const expiredGists = overview?.expired ?? 0;
  const signedGists = overview?.signed ?? 0;
  const anonymousGists = overview?.anonymous ?? 0;
  const uniqueAuthors = overview?.uniqueAuthors ?? 0;
  const totalReports = overview?.totalReports ?? 0;

  const signedPercentage = totalGists > 0 ? ((signedGists / totalGists) * 100).toFixed(1) : '0';

  const timeseriesData = timeseries?.map((d) => ({
    bucket: d.bucket,
    count: d.count,
    signed: d.signed,
    anonymous: d.anonymous,
  })) ?? [];

  const donutSegments = [
    { label: 'Active', value: activeGists, color: '#22c55e' },
    { label: 'Hidden', value: hiddenGists, color: '#ef4444' },
    { label: 'Expired', value: expiredGists, color: '#f59e0b' },
  ].filter((s) => s.value > 0);

  const authorDonutSegments = [
    { label: 'Signed', value: signedGists, color: '#3b82f6' },
    { label: 'Anonymous', value: anonymousGists, color: '#6b7280' },
  ].filter((s) => s.value > 0);

  return (
    <DashboardLayout title="Overview" description="Platform-wide metrics and activity summary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Total Gists"
          value={totalGists.toLocaleString()}
          sparkline={timeseriesData.map((d) => d.count)}
        />
        <KPICard
          title="Active Gists"
          value={activeGists.toLocaleString()}
          description={`${((activeGists / (totalGists || 1)) * 100).toFixed(1)}% of total`}
        />
        <KPICard
          title="Unique Authors"
          value={uniqueAuthors.toLocaleString()}
        />
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString()}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card title="Gists Status" className="h-full">
          <div className="h-64">
            {donutSegments.length > 0 ? (
              <DonutChart segments={donutSegments} centerLabel="Gists" centerValue={totalGists.toLocaleString()} />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500">No data</div>
            )}
          </div>
        </Card>

        <Card title="Author Type" className="h-full">
          <div className="h-64">
            {authorDonutSegments.length > 0 ? (
              <DonutChart segments={authorDonutSegments} centerLabel="Authors" centerValue={uniqueAuthors.toLocaleString()} />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500">No data</div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Gists Over Time" description="Created gists with signed/anonymous breakdown">
        <div className="h-80">
          {timeseriesData.length > 0 ? (
            <LineChart
              data={timeseriesData}
              xKey="bucket"
              yKeys={['count', 'signed', 'anonymous']}
              colors={['#3b82f6', '#22c55e', '#6b7280']}
              height={300}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">No data for selected range</div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <StatCard label="Signed Gists" value={signedGists.toLocaleString()} description={`${signedPercentage}% of total`} />
        <StatCard label="Anonymous Gists" value={anonymousGists.toLocaleString()} />
        <StatCard label="API Submitted" value={(overview?.apiSubmitted ?? 0).toLocaleString()} />
      </div>
    </DashboardLayout>
  );
}