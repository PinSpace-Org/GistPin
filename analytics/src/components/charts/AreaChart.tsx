'use client';

import { useMemo } from 'react';

interface AreaDataPoint {
  [key: string]: string | number;
}

interface AreaChartProps {
  data: AreaDataPoint[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, key: string) => string;
  className?: string;
}

export function AreaChart({
  data,
  xKey,
  yKeys,
  colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
  height = 300,
  showTooltip = true,
  tooltipFormatter,
  className = '',
}: AreaChartProps) {
  const { minX, maxX, minY, maxY, points, totals } = useMemo(() => {
    if (data.length === 0) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1, points: [], totals: [] };
    }

    const xValues = data.map((d) => d[xKey]);
    const minX = Math.min(...xValues.map((v) => (typeof v === 'string' ? new Date(v).getTime() : v)));
    const maxX = Math.max(...xValues.map((v) => (typeof v === 'string' ? new Date(v).getTime() : v)));

    let minY = Infinity;
    let maxY = -Infinity;

    const points = data.map((d) => {
      const point: Record<string, number> = {};
      for (const key of yKeys) {
        const val = Number(d[key] ?? 0);
        point[key] = val;
      }
      return point;
    });

    const totals = points.map((p) => Object.values(p).reduce((a, b) => a + b, 0));
    minY = 0;
    maxY = Math.max(...totals, 1);

    return { minX, maxX, minY, maxY, points, totals };
  }, [data, xKey, yKeys]);

  const width = typeof window !== 'undefined' ? 800 : 800;
  const padding = { top: 20, right: 100, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xScale = (x: string | number) => {
    const val = typeof x === 'string' ? new Date(x).getTime() : x;
    return padding.left + ((val - minX) / (maxX - minX || 1)) * innerWidth;
  };

  const yScale = (y: number) => {
    return padding.top + innerHeight - (y / maxY) * innerHeight;
  };

  const formatX = (x: string | number) => {
    if (typeof x === 'string') {
      const date = new Date(x);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return String(x);
  };

  const cumulativePoints = points.map((point) => {
    const cumulative: Record<string, number> = {};
    let sum = 0;
    for (const key of yKeys) {
      sum += point[key];
      cumulative[key] = sum;
    }
    return cumulative;
  });

  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: width }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          {yKeys.map((key, keyIndex) => {
            const color = colors[keyIndex % colors.length];
            return (
              <linearGradient key={key} id={`area-gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </linearGradient>
            );
          })}
        </defs>

        <g className="grid-lines" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerHeight * t}
              y2={padding.top + innerHeight * t}
            />
          ))}
        </g>

        {yKeys.map((key, keyIndex) => {
          const color = colors[keyIndex % colors.length];
          const prevKey = keyIndex > 0 ? yKeys[keyIndex - 1] : null;

          const pathData = data
            .map((d, i) => {
              const x = xScale(d[xKey]);
              const y = yScale(cumulativePoints[i][key]);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          const bottomPath = data
            .map((d, i) => {
              const x = xScale(d[xKey]);
              const y = prevKey ? yScale(cumulativePoints[i][prevKey]) : height - padding.bottom;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .reverse()
            .join(' ');

          return (
            <g key={key}>
              <path
                d={`${pathData} ${bottomPath} Z`}
                fill={`url(#area-gradient-${key})`}
                stroke="none"
              />
              <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        <g fontSize={12} fill="currentColor" opacity="0.6">
          {data.map((d, i) => (
            <text
              key={i}
              x={xScale(d[xKey])}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {formatX(d[xKey])}
            </text>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t}
              x={padding.left - 10}
              y={padding.top + innerHeight * (1 - t)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {Math.round(maxY * (1 - t)).toLocaleString()}
            </text>
          ))}
        </g>

        <g className="legend" transform={`translate(${width - padding.right + 10}, ${padding.top})`} fontSize={12}>
          {yKeys.map((key, i) => (
            <g key={key} transform={`translate(0, ${i * 20})`}>
              <circle r={4} fill={colors[i % colors.length]} />
              <text x={14} y={4} fill="currentColor" dominantBaseline="middle">
                {key}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}