'use client';

interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChart({
  segments,
  height = 300,
  showLegend = true,
  showLabels = true,
  centerLabel,
  centerValue,
  className = '',
}: DonutChartProps) {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const segmentsWithAngles = segments.map((segment, i) => {
    const angle = (segment.value / (total || 1)) * 360;
    return { ...segment, angle, color: segment.color ?? colors[i % colors.length] };
  });

  const radius = 80;
  const innerRadius = 50;

  let currentAngle = -90;

  const pathData = segmentsWithAngles.map((segment) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + segment.angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius * Math.cos(startRad);
    const y1 = radius * Math.sin(startRad);
    const x2 = radius * Math.cos(endRad);
    const y2 = radius * Math.sin(endRad);
    const x3 = innerRadius * Math.cos(endRad);
    const y3 = innerRadius * Math.sin(endRad);
    const x4 = innerRadius * Math.cos(startRad);
    const y4 = innerRadius * Math.sin(startRad);

    const largeArcFlag = segment.angle > 180 ? 1 : 0;

    return (
      <path
        key={segment.label}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`}
        fill={segment.color}
      />
    );
  });

  const labelPaths = segmentsWithAngles
    .filter((s) => s.angle > 10)
    .map((segment) => {
      const midAngle = (segment.angle / 2 + (segment.angle > 360 ? 0 : 0)) * (Math.PI / 180);
      const labelRadius = (radius + innerRadius) / 2;
      const x = labelRadius * Math.cos(midAngle);
      const y = labelRadius * Math.sin(midAngle);
      const percentage = ((segment.value / (total || 1)) * 100).toFixed(1);

      return (
        <g key={segment.label}>
          <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="white" fontWeight={600}>
            {percentage}%
          </text>
        </g>
      );
    });

  const width = typeof window !== 'undefined' ? 400 : 400;

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ width: '100%' }}>
      <div className="relative" style={{ width: '100%', maxWidth: width }}>
        <svg
          width="100%"
          height={height}
          viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
        >
          <g transform="translate(0, 0)">
            {pathData}
            {showLabels && <g>{labelPaths}</g>}
          </g>

          {centerLabel || centerValue ? (
            <g transform="translate(0, 0)">
              {centerValue && (
                <text
                  x={0}
                  y={-4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={24}
                  fontWeight={700}
                  fill="currentColor"
                >
                  {centerValue}
                </text>
              )}
              {centerLabel && (
                <text
                  x={0}
                  y={20}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="currentColor"
                  opacity={0.6}
                >
                  {centerLabel}
                </text>
              )}
            </g>
          ) : null}
        </svg>
      </div>

      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          {segmentsWithAngles.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: segment.color }} />
              <span className="text-neutral-600 dark:text-neutral-400">{segment.label}</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                {((segment.value / (total || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}