'use client';

import { useEffect, useRef, useState, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Users,
  BarChart2,
  Activity,
  type LucideIcon,
} from 'lucide-react';

// ── Animated counter ──────────────────────────────────────────────────────────

function useCountAnimation(target: number, duration = 1200): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    const start = initialised.current ? display : 0;
    initialised.current = true;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KPICardProps {
  title: string;
  /** Raw numeric value to count up to */
  value: number;
  /** Percentage change vs previous period (positive = up, negative = down) */
  change: number;
  /** Custom display formatter — defaults to locale-formatted integer */
  format?: (n: number) => string;
  icon: LucideIcon;
  accentColor?: string;
}

// ── KPICard ───────────────────────────────────────────────────────────────────

export const KPICard = memo(function KPICard({
  title,
  value,
  change,
  format = (n) => n.toLocaleString(),
  icon: Icon,
  accentColor = '#6366f1',
}: KPICardProps) {
  const displayValue = useCountAnimation(value);
  const isUp = change > 0;
  const isFlat = change === 0;

  const trendColor = isUp ? '#22c55e' : isFlat ? '#9ca3af' : '#ef4444';
  const TrendIcon = isUp ? TrendingUp : isFlat ? Minus : TrendingDown;
  const sign = isUp ? '+' : '';

  return (
    <div
      style={{
        borderRadius: 16,
        padding: '24px 28px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </span>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accentColor}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>

      {/* Animated value */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 800,
          lineHeight: 1,
          color: '#111827',
          letterSpacing: '-0.03em',
        }}
      >
        {format(displayValue)}
      </div>

      {/* Trend indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 13,
            fontWeight: 700,
            color: trendColor,
          }}
        >
          <TrendIcon size={14} strokeWidth={2.5} />
          {sign}{Math.abs(change).toFixed(1)}%
        </span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>vs last month</span>
      </div>
    </div>
  );
});

// ── Default KPI dataset ───────────────────────────────────────────────────────

const KPI_DATA: KPICardProps[] = [
  {
    title: 'Total Gists',
    value: 1_284,
    change: 12.5,
    icon: FileText,
    accentColor: '#6366f1',
  },
  {
    title: 'Active Users',
    value: 847,
    change: 8.3,
    icon: Users,
    accentColor: '#3b82f6',
  },
  {
    title: 'Growth Rate',
    value: 23,
    change: 5.1,
    format: (n) => `${n}%`,
    icon: BarChart2,
    accentColor: '#22c55e',
  },
  {
    title: 'Engagement',
    value: 3_291,
    change: -2.8,
    icon: Activity,
    accentColor: '#f59e0b',
  },
];

// ── KPIGrid ───────────────────────────────────────────────────────────────────

export default function KPIGrid() {
  return (
    <>
      <style>{`
        @keyframes kpiFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
        .kpi-card-wrapper {
          animation: kpiFadeUp 0.45s ease both;
        }
        .kpi-card-wrapper:nth-child(1) { animation-delay: 0ms; }
        .kpi-card-wrapper:nth-child(2) { animation-delay: 80ms; }
        .kpi-card-wrapper:nth-child(3) { animation-delay: 160ms; }
        .kpi-card-wrapper:nth-child(4) { animation-delay: 240ms; }
      `}</style>

      <div className="kpi-grid">
        {KPI_DATA.map((kpi) => (
          <div key={kpi.title} className="kpi-card-wrapper">
            <KPICard {...kpi} />
          </div>
        ))}
      </div>
    </>
  );
}
