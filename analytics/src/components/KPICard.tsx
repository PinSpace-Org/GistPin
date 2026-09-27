'use client';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparkline?: number[];
  className?: string;
}

export function KPICard({ title, value, change, changeLabel, sparkline, className = '' }: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{changeLabel ?? 'vs previous period'}</span>
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 0 && (
          <div className="flex-shrink-0 w-32 h-16" aria-hidden="true">
            <Sparkline data={sparkline} color={isPositive ? '#22c55e' : '#ef4444'} />
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 128;
  const height = 48;
  const padding = 2;

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}