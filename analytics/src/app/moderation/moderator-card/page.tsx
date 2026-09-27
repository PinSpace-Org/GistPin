'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/Card';
import { KPICard } from '@/components/KPICard';
import { CopyButton } from '@/components/CopyButton';
import { EmptyState } from '@/components/EmptyState';
import { truncateAddress } from '@/lib/format';
import { useModerator } from '@/hooks';

export default function ModeratorCardPage() {
  const { data, isLoading, error, refetch } = useModerator({ refreshInterval: 30000 });

  const handleRefresh = () => {
    refetch();
  };

  const moderatorAddress = data?.moderatorAddress;

  return (
    <DashboardLayout title="Moderator Address Card" description="Current moderator address from the contract">
      <div className="mb-6 flex items-center justify-between">
        <div />
        <button
          onClick={handleRefresh}
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
          <div className="text-red-600 dark:text-red-400">Failed to load moderator: {error.message}</div>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <Card title="Moderator Address">
            <div className="space-y-4">
              {moderatorAddress ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Moderator Address</p>
                      <code className="font-mono text-lg text-neutral-900 dark:text-neutral-100 break-all">{truncateAddress(moderatorAddress)}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton value={moderatorAddress} label="address" />
                    <a
                      href={`https://stellar.expert/explorer/public/account/${moderatorAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on Explorer
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">No Moderator Set</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">The contract does not currently have a moderator address configured.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Details" description="Information about the moderator role">
            <div className="prose text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
              <p>The moderator address is the Stellar account that has permission to perform moderation actions on the GistPin contract:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Hide reported gists</li>
                <li>Unhide previously hidden gists</li>
                <li>Remove gists entirely</li>
              </ul>
              <p>This address is stored in the contract and can be updated by the contract admin.</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Data source: <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">GET /v1/gists/moderator</code>
              </p>
            </div>
          </Card>

          <Card title="Raw Response">
            <pre className="bg-neutral-100 dark:bg-neutral-900 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify({ moderatorAddress }, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}