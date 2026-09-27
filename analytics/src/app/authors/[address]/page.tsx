'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BucketSelector } from '@/components/BucketSelector';
import { RefreshControl } from '@/components/RefreshControl';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { EmptyState } from '@/components/EmptyState';
import { CopyButton } from '@/components/CopyButton';
import { formatCompactNumber, truncateAddress, formatIsoToLocal } from '@/lib/format';
import { useGists, useAuthorsTop } from '@/hooks';

interface AuthorDetailPageProps {
  params: Promise<{ address: string }>;
}

export default function AuthorDetailPage({ params }: AuthorDetailPageProps) {
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [resolvedParams, setResolvedParams] = useState<{ address: string } | null>(null);

  const { address } = resolvedParams ?? (await params);
  
  if (!resolvedParams) {
    setResolvedParams({ address });
  }

  const isValidAddress = (addr: string) => /^G[A-Z0-9]{55}$/.test(addr);

  const { data: gistsData, isLoading: gistsLoading, error: gistsError, refetch: refetchGists } = useGists(
    {
      lat: 0,
      lon: 0,
      radius: 5000,
      authorAddress: address,
      limit: 50,
    },
    { refreshInterval: 30000 },
  );

  const { data: authorsData, refetch: refetchAuthors } = useAuthorsTop({ refreshInterval: 30000 });
  const authorInfo = authorsData?.authors.find((a) => a.address === address);

  const handleRefresh = () => {
    refetchGists();
    refetchAuthors();
  };

  if (!isValidAddress(address)) {
    return (
      <DashboardLayout title="Invalid Author Address" description="The provided address format is not valid">
        <Card>
          <EmptyState
            title="Invalid Address Format"
            description="Author addresses must be Stellar public keys starting with 'G' followed by 55 alphanumeric characters."
            action={<CopyButton value={address} label="address" />}
          />
        </Card>
      </DashboardLayout>
    );
  }

  const gists = gistsData?.data ?? [];

  if (gistsLoading) {
    return (
      <DashboardLayout title={`Author: ${truncateAddress(address)}`} description="Author activity and gists">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (gistsError) {
    return (
      <DashboardLayout title={`Author: ${truncateAddress(address)}`} description="Author activity and gists">
        <Card>
          <EmptyState title="Failed to load gists" description={gistsError.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  const totalGists = gists.length;
  const activeGists = gists.filter((g) => g.is_active && !g.hidden && new Date(g.expires_at) > new Date()).length;
  const hiddenGists = gists.filter((g) => g.hidden).length;
  const totalReports = gists.reduce((sum, g) => sum + g.report_count, 0);

  return (
    <DashboardLayout title={`Author: ${truncateAddress(address)}`} description="Author activity and gists">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">{truncateAddress(address)}</code>
            <CopyButton value={address} label="address" className="w-fit" />
          </div>
          <DateRangePicker defaultFrom={from} defaultTo={to} />
          <BucketSelector defaultBucket={bucket} />
        </div>
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <KPICard title="Total Gists" value={totalGists.toLocaleString()} />
        <KPICard title="Active Gists" value={activeGists.toLocaleString()} />
        <KPICard title="Hidden Gists" value={hiddenGists.toLocaleString()} />
        <KPICard title="Total Reports" value={totalReports.toLocaleString()} />
      </div>

      {authorInfo && (
        <Card title="Author Rank" className="mb-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">#{authorsData?.authors.findIndex((a) => a.address === address) ?? 0 + 1}</div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Rank among all authors</p>
              <p className="font-medium">{formatCompactNumber(authorInfo.postCount)} posts</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Recent Gists" description={`Showing ${gists.length} most recent gists in the selected area`}>
        {gists.length === 0 ? (
          <EmptyState title="No gists found" description="This author has no gists in the selected area and time range." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gist ID</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gists.map((gist) => (
                  <TableRow key={gist.id}>
                    <TableCell>
                      <code className="font-mono text-sm">{truncateAddress(gist.id, 8, 6)}</code>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">{gist.content.slice(0, 100)}</div>
                    </TableCell>
                    <TableCell>{formatIsoToLocal(gist.created_at)}</TableCell>
                    <TableCell>{formatIsoToLocal(gist.expires_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${gist.hidden ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : gist.is_active && new Date(gist.expires_at) > new Date() ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'}`}>
                        {gist.hidden ? 'Hidden' : gist.is_active && new Date(gist.expires_at) > new Date() ? 'Active' : 'Expired'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{gist.report_count}</TableCell>
                    <TableCell>
                      <CopyButton value={gist.id} label="gist ID" className="w-fit" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}