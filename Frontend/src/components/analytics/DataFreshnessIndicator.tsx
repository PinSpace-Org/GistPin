import React from 'react';

export interface DataFreshnessIndicatorProps {
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  lastUpdated = 'Just now',
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs">
      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Synced {lastUpdated}
      </span>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
};

export default DataFreshnessIndicator;
