'use client';

import React from 'react';
import type { IndexerStatsResponse } from '@/lib/api/types';

export interface IndexerHealthCardProps {
  data?: IndexerStatsResponse;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  className?: string;
}

export function IndexerHealthCard({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  className = '',
}: IndexerHealthCardProps) {
  if (isLoading) {
    return (
      <div
        data-testid="indexer-health-card-loading"
        className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Indexer Health
          </h3>
        </div>
        <div className="h-32 flex items-center justify-center text-neutral-500">
          Loading indexer status...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="indexer-health-card-error"
        className={`rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-6 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
            Indexer Health
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium underline"
            >
              Retry
            </button>
          )}
        </div>
        <p className="text-sm text-red-700 dark:text-red-300">
          Failed to fetch indexer health: {error.message}
        </p>
      </div>
    );
  }

  const cursorLedger = data?.cursorLedger ?? 0;
  const latestLedger = data?.latestLedger ?? 0;
  const lag = data?.lag ?? Math.max(0, latestLedger - cursorLedger);
  const status = data?.status ?? (lag === 0 ? 'healthy' : lag < 10 ? 'syncing' : 'degraded');
  const isMockMode = Boolean(data?.mockMode);

  // Status configuration with color badges and descriptive text (not color alone)
  const statusConfig: Record<
    'healthy' | 'syncing' | 'degraded' | 'stalled',
    {
      label: string;
      description: string;
      badgeColor: string;
      dotColor: string;
      textColor: string;
    }
  > = {
    healthy: {
      label: 'Healthy',
      description: 'Ingestion is fully up-to-date with current ledger.',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-400',
    },
    syncing: {
      label: 'Syncing',
      description: 'Indexer is catching up with recent network ledgers.',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
      dotColor: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
    },
    degraded: {
      label: 'Degraded',
      description: 'Indexer lag is elevated; ingestion is delayed.',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-700 dark:text-amber-400',
    },
    stalled: {
      label: 'Stalled',
      description: 'Cursor has halted and is no longer advancing.',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-700 dark:text-rose-400',
    },
  };

  const config = statusConfig[status] ?? statusConfig.healthy;

  return (
    <div
      data-testid="indexer-health-card"
      className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Indexer Health
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Soroban event ingestion tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh indexer status"
              className="text-xs px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
            >
              Refresh
            </button>
          )}
          <span
            data-testid="status-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeColor}`}
          >
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} aria-hidden="true" />
            <span data-testid="status-text">{config.label}</span>
          </span>
        </div>
      </div>

      {isMockMode && (
        <div
          data-testid="mock-mode-notice"
          className="mb-4 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
        >
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <span className="font-semibold">Mock Mode Active:</span> The indexer is running in mock/simulated mode. Ledgers and event logs are synthesized locally rather than queried from live Soroban RPC.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-md border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/40 p-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Cursor Ledger
          </p>
          <p data-testid="cursor-ledger" className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {cursorLedger.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Last processed
          </p>
        </div>

        <div className="rounded-md border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/40 p-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Latest Ledger
          </p>
          <p data-testid="latest-ledger" className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {latestLedger.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Network tip
          </p>
        </div>

        <div className="rounded-md border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/40 p-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Ledger Lag
          </p>
          <p data-testid="ledger-lag" className={`mt-1 text-xl font-bold ${config.textColor}`}>
            {lag.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Ledgers behind
          </p>
        </div>
      </div>

      <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <span>{config.description}</span>
        {data?.lastUpdated && (
          <span className="text-[11px] text-neutral-400">
            Updated {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
