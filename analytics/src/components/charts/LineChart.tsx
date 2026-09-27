'use client';

import { useMemo } from 'react';

interface DataPoint {
  [key: string]: unknown;
}

interface LineChartProps {
  data: DataPoint[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, key: string) => string;
  className?: string;
}

export function LineChart({
  data,
  xKey,
  yKeys,
  colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
  height = 300,
  showTooltip = true,
  tooltipFormatter,
  className = '',
}: LineChartProps) {
  const { minX, maxX, minY, maxY, points } = useMemo(() => {
    if (data.length === 0) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1, points: [] };
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
        minY = Math.min(minY, val);
        maxY = Math.max(maxY, val);
      }
      return point;
    });

    return { minX, maxX, minY: minY === Infinity ? 0 : minY, maxY: maxY === -Infinity ? 1 : maxY, points };
  }, [data, xKey, yKeys]);

  const width = typeof window !== 'undefined' ? 800 : 800;
  const padding = { top: 20, right: 80, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xScale = (x: string | number) => {
    const val = typeof x === 'string' ? new Date(x).getTime() : x;
    return padding.left + ((val - minX) / (maxX - minX || 1)) * innerWidth;
  };

  const yScale = (y: number) => {
    return padding.top + innerHeight - ((y - minY) / (maxY - minY || 1)) * innerHeight;
  };

  const formatX = (x: string | number) => {
    if (typeof x === 'string') {
      const date = new Date(x);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return String(x);
  };

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
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
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

        {points.map((point, i) => {
          const x = xScale(data[i][xKey]);
          return (
            <g key={i} className="tooltip-target">
              {yKeys.map((key, keyIndex) => {
                const y = yScale(point[key]);
                return (
                  <circle
                    key={key}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={colors[keyIndex % colors.length]}
                    stroke="white"
                    strokeWidth={2}
                    className="opacity-0 hover:opacity-100 transition-opacity"
                  />
                );
              })}
            </g>
          );
        })}

        {yKeys.map((key, keyIndex) => {
          const color = colors[keyIndex % colors.length];
          const pathData = points
            .map((point, i) => {
              const x = xScale(data[i][xKey]);
              const y = yScale(point[key]);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          return (
            <g key={key} color={color}>
              <path
                d={pathData}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`${pathData} L${xScale(data[data.length - 1][xKey])} ${height - padding.bottom} L${xScale(data[0][xKey])} ${height - padding.bottom} Z`}
                fill="url(#fade)"
                stroke="none"
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
              {Math.round(minY + (maxY - minY) * (1 - t)).toLocaleString()}
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

      {showTooltip && (
        <div className="absolute pointer-events-none" style={{ top: padding.top, left: padding.left }}>
          <div className="bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 transition-opacity">
            Hover a point for details
          </div>
        </div>
      )}
    </div>
  );
}