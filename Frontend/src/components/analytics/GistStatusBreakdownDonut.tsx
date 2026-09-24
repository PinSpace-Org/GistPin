import React from 'react';

export interface StatusCounts {
  active: number;
  expired: number;
  hidden: number;
}

export interface GistStatusBreakdownDonutProps {
  counts?: StatusCounts;
}

export const GistStatusBreakdownDonut: React.FC<GistStatusBreakdownDonutProps> = ({
  counts = { active: 65, expired: 25, hidden: 10 },
}) => {
  const total = counts.active + counts.expired + counts.hidden || 1;
  const activePct = (counts.active / total) * 100;
  const expiredPct = (counts.expired / total) * 100;

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Gist Status Breakdown
      </h4>
      <div className="flex items-center gap-4 text-xs">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-amber-500 border-r-rose-500 flex items-center justify-center font-bold">
          {total}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Active: {counts.active} ({activePct.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Expired: {counts.expired} ({expiredPct.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Hidden: {counts.hidden}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GistStatusBreakdownDonut;
