import React from 'react';

export interface FeedGistItem {
  id: string;
  snippet: string;
  timestamp: string;
}

export interface RecentGistsFeedProps {
  items?: FeedGistItem[];
}

export const RecentGistsFeed: React.FC<RecentGistsFeedProps> = ({
  items = [],
}) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Recent Gists in Selected Area
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">No recent gists found in this bounding box.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs border border-gray-100 dark:border-gray-750">
              <p className="text-gray-800 dark:text-gray-200 font-mono">{item.snippet}</p>
              <span className="text-[10px] text-gray-400">{item.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentGistsFeed;
