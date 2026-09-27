'use client';

import { useMemo } from 'react';

interface BarDataPoint {
  label: string;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarDataPoint[];
  labelKey: string;
  valueKeys: string[];
  colors?: string[];
  height?: number;
  stacked?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, key: string) => string;
  className?: string;
  maxBars?: number;
}

export function BarChart({
  data,
  labelKey,
  valueKeys,
  colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
  height = 300,
  stacked = false,
  showTooltip = true,
  tooltipFormatter,
  className = '',
  maxBars = 20,
}: BarChartProps) {
  const { maxValue, points, labels } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 1, points: [], labels: [] };
    }

    const limitedData = data.slice(0, maxBars);
    const labels = limitedData.map((d) => String(d[labelKey]));

    let maxValue = 0;
    const points = limitedData.map((d) => {
      const point: Record<string, number> = {};
      for (const key of valueKeys) {
        const val = Number(d[key] ?? 0);
        point[key] = val;
        if (stacked) {
          // For stacked, we'll calculate max per bar
        } else {
          maxValue = Math.max(maxValue, val);
        }
      }
      if (stacked) {
        const sum = Object.values(point).reduce((a, b) => a + b, 0);
        maxValue = Math.max(maxValue, sum);
      }
      return point;
    });

    return { maxValue, points, labels };
  }, [data, labelKey, valueKeys, stacked, maxBars]);

  const width = typeof window !== 'undefined' ? 800 : 800;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const barWidth = innerWidth / (points.length * (stacked ? 1 : valueKeys.length) + points.length + 1);

  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: width }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
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
          const baseX = padding.left + (innerWidth / points.length) * i + (innerWidth / points.length) / 2;

          if (stacked) {
            let yOffset = 0;
            return (
              <g key={i}>
                {valueKeys.map((key, keyIndex) => {
                  const value = point[key];
                  const barHeight = (value / maxValue) * innerHeight;
                  const y = height - padding.bottom - yOffset - barHeight;
                  yOffset += barHeight;

                  return (
                    <rect
                      key={key}
                      x={baseX - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={colors[keyIndex % colors.length]}
                      rx={2}
                      ry={2}
                    />
                  );
                })}
              </g>
            );
          } else {
            return (
              <g key={i}>
                {valueKeys.map((key, keyIndex) => {
                  const value = point[key];
                  const barHeight = (value / maxValue) * innerHeight;
                  const x = baseX + (keyIndex - (valueKeys.length - 1) / 2) * barWidth;

                  return (
                    <rect
                      key={key}
                      x={x}
                      y={height - padding.bottom - barHeight}
                      width={barWidth * 0.8}
                      height={barHeight}
                      fill={colors[keyIndex % colors.length]}
                      rx={2}
                      ry={2}
                    />
                  );
                })}
              </g>
            );
          }
        })}

        <g fontSize={11} fill="currentColor" opacity="0.6">
          {labels.map((label, i) => (
            <text
              key={i}
              x={padding.left + (innerWidth / labels.length) * i + (innerWidth / labels.length) / 2}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {label.length > 15 ? label.slice(0, 12) + '...' : label}
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
              {Math.round(maxValue * (1 - t)).toLocaleString()}
            </text>
          ))}
        </g>

        <g className="legend" transform={`translate(${width - padding.right + 10}, ${padding.top})`} fontSize={12}>
          {valueKeys.map((key, i) => (
            <g key={key} transform={`translate(0, ${i * 20})`}>
              <rect width={12} height={12} fill={colors[i % colors.length]} rx={2} />
              <text x={18} y={10} fill="currentColor" dominantBaseline="middle">
                {key}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}