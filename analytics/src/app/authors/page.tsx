'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RefreshControl } from '@/components/RefreshControl';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { Card } from '@/components/Card';
import { CopyButton } from '@/components/CopyButton';
import { EmptyState } from '@/components/EmptyState';
import { formatCompactNumber, truncateAddress } from '@/lib/format';
import { useAuthorsTop } from '@/hooks';

export default function AuthorsPage() {
  const { data, isLoading, error, refetch } = useAuthorsTop({ refreshInterval: 30000 });

  const authors = data?.authors ?? [];

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Top Authors" description="Most active authors by post count">
        <Card>
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Top Authors" description="Most active authors by post count">
        <Card>
          <EmptyState title="Failed to load authors" description={error.message} action={<button onClick={handleRefresh} className="text-blue-600 hover:underline">Retry</button>} />
        </Card>
      </DashboardLayout>
    );
  }

  if (authors.length === 0) {
    return (
      <DashboardLayout title="Top Authors" description="Most active authors by post count">
        <Card>
          <EmptyState
            title="No authors found"
            description="No signed authors found in the selected area. Only signed posts are counted."
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Top Authors" description="Most active authors by post count (signed posts only)">
      <div className="mb-6 flex items-center justify-between">
        <div />
        <RefreshControl onRefresh={handleRefresh} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Author Address</TableHead>
                <TableHead>Post Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((author, index) => (
                <TableRow key={author.address}>
                  <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{index + 1}</TableCell>
                  <TableCell>
                    <code className="font-mono text-sm">{truncateAddress(author.address)}</code>
                  </TableCell>
                  <TableCell className="font-medium">{formatCompactNumber(author.postCount)}</TableCell>
                  <TableCell>
                    <CopyButton value={author.address} label="address" className="w-fit" />
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