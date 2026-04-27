'use client';

type Color = 'brand' | 'green' | 'yellow' | 'red' | 'blue';
type Size = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: Color;
  size?: Size;
  label?: string;
  showPercent?: boolean;
}

interface CircularProgressProps {
  value: number;
  max?: number;
  color?: Color;
  size?: number;
  label?: string;
  showPercent?: boolean;
}

const trackColor: Record<Color, string> = {
  brand: 'bg-brand',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

const strokeColor: Record<Color, string> = {
  brand: 'stroke-brand',
  green: 'stroke-green-500',
  yellow: 'stroke-yellow-500',
  red: 'stroke-red-500',
  blue: 'stroke-blue-500',
};

const barHeight: Record<Size, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  max = 100,
  color = 'brand',
  size = 'md',
  label,
  showPercent = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-gray-200 dark:bg-gray-700 ${barHeight[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`${barHeight[size]} rounded-full transition-all duration-300 ${trackColor[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CircularProgress({
  value,
  max = 100,
  color = 'brand',
  size = 64,
  label,
  showPercent = true,
}: CircularProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          className="stroke-gray-200 dark:stroke-gray-700"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          className={`${strokeColor[color]} transition-all duration-300`}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        {showPercent && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="rotate-90 fill-gray-700 dark:fill-gray-300 text-xs font-semibold"
            style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: size * 0.2 }}
          >
            {Math.round(pct)}%
          </text>
        )}
      </svg>
      {label && <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  );
}

export default ProgressBar;
