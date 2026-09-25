import React from 'react';

export interface TimePoint {
  date: string;
  count: number;
}

export interface GistsOverTimeChartProps {
  data?: TimePoint[];
}

export const GistsOverTimeChart: React.FC<GistsOverTimeChartProps> = ({
  data = [
    { date: 'Day 1', count: 12 },
    { date: 'Day 2', count: 19 },
    { date: 'Day 3', count: 15 },
    { date: 'Day 4', count: 28 },
  ],
}) => {
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Gists Created Over Time
      </h3>
      <div className="flex items-end h-32 gap-2 pt-2">
        {data.map((pt, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-emerald-500 rounded-t transition-all"
              style={{ height: `${(pt.count / max) * 100}%` }}
            />
            <span className="text-[10px] text-gray-400 mt-1">{pt.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GistsOverTimeChart;
