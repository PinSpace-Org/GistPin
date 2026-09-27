'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/Card';
import { KPICard } from '@/components/KPICard';
import { useHealth } from '@/hooks';
import { formatRelativeTime } from '@/lib/format';

export default function SystemPage() {
  const { data: health, isLoading, error, refetch } = useHealth({ refreshInterval: 30000 });

  return (
    <DashboardLayout title="System Health" description="Backend and infrastructure health status">
      <div className="mb-6 flex items-center justify-between">
        <div />
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {isLoading && (
        <Card>
          <div className="h-32 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="text-red-600 dark:text-red-400">Failed to load health: {error.message}</div>
        </Card>
      )}

      {health && !isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Overall Status"
            value={health.status === 'ok' ? 'Healthy' : 'Degraded'}
            description={formatRelativeTime(health.timestamp)}
          />
          <KPICard
            title="Database"
            value={health.services.database.status === 'ok' ? 'OK' : 'Error'}
            description={health.services.database.message ?? 'No details'}
          />
          <KPICard
            title="PostGIS"
            value={health.services.postgis.status === 'ok' ? 'OK' : 'Error'}
            description={health.services.postgis.message ?? 'No details'}
          />
        </div>
      )}

      {health && !isLoading && !error && (
        <Card title="Raw Health Data" className="mt-6">
          <pre className="bg-neutral-100 dark:bg-neutral-900 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        </Card>
      )}
    </DashboardLayout>
  );
}