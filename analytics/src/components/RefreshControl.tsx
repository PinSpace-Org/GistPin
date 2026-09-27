'use client';

import { useCallback, useEffect, useState } from 'react';

interface RefreshControlProps {
  onRefresh: () => void;
  autoRefreshInterval?: number;
  disabled?: boolean;
  className?: string;
}

export function RefreshControl({
  onRefresh,
  autoRefreshInterval = 30000,
  disabled = false,
  className = '',
}: RefreshControlProps) {
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const handleRefresh = useCallback(() => {
    onRefresh();
    setLastRefreshed(new Date());
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const interval = setInterval(() => {
      setIsAutoRefreshing(true);
      handleRefresh();
      setTimeout(() => setIsAutoRefreshing(false), 1000);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [disabled, autoRefreshInterval, handleRefresh]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={disabled || isAutoRefreshing}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg
          className={`w-4 h-4 ${isAutoRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>

      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        {isAutoRefreshing && (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Updating...
          </span>
        )}
        {lastRefreshed && !isAutoRefreshing && (
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}