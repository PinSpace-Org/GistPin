import React from 'react';

export interface SparklineKpiCardProps {
  title: string;
  value: string | number;
  trend: number[]; // Array of numeric points
  changePercent?: number;
}

export const SparklineKpiCard: React.FC<SparklineKpiCardProps> = ({
  title,
  value,
  trend = [10, 20, 15, 30, 25, 40],
  changePercent = 12.5,
}) => {
  const min = Math.min(...trend);
  const max = Math.max(...trend, 1);
  const points = trend.map((val, idx) => {
    const x = (idx / (trend.length - 1)) * 100;
    const y = 30 - ((val - min) / (max - min)) * 25;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
        <span className={`text-xs font-semibold ${changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {changePercent >= 0 ? '+' : ''}{changePercent}%
        </span>
      </div>
      <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 30">
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
};

export default SparklineKpiCard;
