'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

// ── Mock data ──────────────────────────────────────────────────────────────────

const TTL_BUCKETS = [
  { label: '1 h',   hours: 1,        count: 212 },
  { label: '6 h',   hours: 6,        count: 348 },
  { label: '12 h',  hours: 12,       count: 476 },
  { label: '1 d',   hours: 24,       count: 918 },
  { label: '3 d',   hours: 72,       count: 643 },
  { label: '7 d',   hours: 168,      count: 527 },
  { label: '30 d',  hours: 720,      count: 314 },
  { label: 'Never', hours: Infinity, count: 182 },
];

const MOST_COMMON_IDX = TTL_BUCKETS.reduce(
  (max, b, i, arr) => (b.count > arr[max].count ? i : max),
  0,
);

const TOTAL = TTL_BUCKETS.reduce((s, b) => s + b.count, 0);
const AVG_LIFESPAN_H = 41.2;
const MEDIAN_TTL_LABEL = '1 d';

const SCATTER_POINTS = [
  { ttl: 1,   eng: 38 }, { ttl: 1,   eng: 42 }, { ttl: 1,   eng: 33 },
  { ttl: 6,   eng: 51 }, { ttl: 6,   eng: 47 }, { ttl: 6,   eng: 44 },
  { ttl: 12,  eng: 60 }, { ttl: 12,  eng: 55 }, { ttl: 12,  eng: 58 },
  { ttl: 24,  eng: 72 }, { ttl: 24,  eng: 68 }, { ttl: 24,  eng: 76 }, { ttl: 24, eng: 80 },
  { ttl: 72,  eng: 65 }, { ttl: 72,  eng: 61 }, { ttl: 72,  eng: 70 },
  { ttl: 168, eng: 58 }, { ttl: 168, eng: 54 }, { ttl: 168, eng: 62 },
  { ttl: 720, eng: 44 }, { ttl: 720, eng: 40 }, { ttl: 720, eng: 48 },
];

function linReg(pts: typeof SCATTER_POINTS) {
  const n = pts.length;
  const sx  = pts.reduce((s, p) => s + p.ttl, 0);
  const sy  = pts.reduce((s, p) => s + p.eng, 0);
  const sxy = pts.reduce((s, p) => s + p.ttl * p.eng, 0);
  const sx2 = pts.reduce((s, p) => s + p.ttl * p.ttl, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

const REG = linReg(SCATTER_POINTS);

const REGIONS = ['NA', 'EU', 'APAC', 'LATAM', 'MEA'];

const LOCATION_TTL = {
  short:  [310, 280, 420, 190, 140],
  medium: [480, 510, 390, 280, 210],
  long:   [210, 240, 180, 110,  90],
};

// ── Shared style tokens ────────────────────────────────────────────────────────

const TICK = { color: '#9ca3af', font: { size: 11 } };
const AXIS_TITLE = (text: string) => ({
  display: true,
  text,
  color: '#6b7280',
  font: { size: 12 },
});
const TOOLTIP_BASE = {
  backgroundColor: 'rgba(17,24,39,0.9)',
  titleColor: '#f9fafb',
  bodyColor: '#d1d5db',
  padding: 12,
  cornerRadius: 8,
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 140,
        flex: '1 1 140px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p
        style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#111827' }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{sub}</p>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <h3
      style={{
        margin: '28px 0 10px',
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </h3>
  );
}

// ── TTL Histogram ──────────────────────────────────────────────────────────────

function TTLHistogram() {
  const bgColors = TTL_BUCKETS.map((_, i) =>
    i === MOST_COMMON_IDX
      ? 'rgba(99, 102, 241, 0.82)'
      : 'rgba(59, 130, 246, 0.65)',
  );
  const borderColors = TTL_BUCKETS.map((_, i) =>
    i === MOST_COMMON_IDX
      ? 'rgba(99, 102, 241, 1)'
      : 'rgba(59, 130, 246, 0.9)',
  );

  const data = {
    labels: TTL_BUCKETS.map((b) => b.label),
    datasets: [
      {
        label: 'Gists',
        data: TTL_BUCKETS.map((b) => b.count),
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.92,
        categoryPercentage: 0.88,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        grid: { display: false },
        ticks: TICK,
        border: { color: '#e5e7eb' },
        title: AXIS_TITLE('TTL setting'),
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: TICK,
        border: { display: false },
        title: AXIS_TITLE('Gists'),
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          title: (items: TooltipItem<'bar'>[]) => `TTL: ${items[0].label}`,
          label: (item: TooltipItem<'bar'>) => {
            const count = item.raw as number;
            const pct = ((count / TOTAL) * 100).toFixed(1);
            return `  ${count.toLocaleString()} gists (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Bar data={data} options={options} />
      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(99,102,241,0.82)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
        Most common TTL bucket
      </p>
    </div>
  );
}

// ── TTL Buckets Summary ────────────────────────────────────────────────────────

function TTLBucketTable() {
  const sorted = [...TTL_BUCKETS].sort((a, b) => b.count - a.count);
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
        color: '#374151',
        marginTop: 4,
      }}
    >
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontWeight: 600 }}>Rank</th>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontWeight: 600 }}>TTL</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#6b7280', fontWeight: 600 }}>Gists</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#6b7280', fontWeight: 600 }}>Share</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((b, i) => (
          <tr
            key={b.label}
            style={{ borderBottom: '1px solid #f3f4f6', background: i === 0 ? '#eef2ff' : 'transparent' }}
          >
            <td style={{ padding: '6px 8px', color: '#9ca3af' }}>#{i + 1}</td>
            <td style={{ padding: '6px 8px', fontWeight: i === 0 ? 600 : 400 }}>{b.label}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{b.count.toLocaleString()}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280' }}>
              {((b.count / TOTAL) * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── TTL vs Engagement Scatter ──────────────────────────────────────────────────

function TTLEngagementScatter() {
  const chartData = {
    datasets: [
      {
        label: 'Gists',
        data: SCATTER_POINTS.map((p) => ({ x: p.ttl, y: p.eng })),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        pointRadius: 5,
      },
      {
        label: 'Trend',
        data: [
          { x: 0,   y: REG.intercept },
          { x: 720, y: REG.slope * 720 + REG.intercept },
        ],
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        ticks: TICK,
        grid: { color: 'rgba(0,0,0,0.05)' },
        title: AXIS_TITLE('TTL (hours)'),
      },
      y: {
        ticks: TICK,
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        title: AXIS_TITLE('Engagement score'),
      },
    },
    plugins: {
      legend: {
        labels: { color: '#6b7280', font: { size: 11 } },
      },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          label: (ctx: TooltipItem<'scatter'>) =>
            `  TTL: ${ctx.parsed.x} h  |  Engagement: ${ctx.parsed.y}`,
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}

// ── Location-based TTL Patterns ────────────────────────────────────────────────

function LocationTTLChart() {
  const data = {
    labels: REGIONS,
    datasets: [
      {
        label: '< 1 day',
        data: LOCATION_TTL.short,
        backgroundColor: 'rgba(239, 68, 68, 0.72)',
        borderRadius: 2,
        barPercentage: 0.85,
      },
      {
        label: '1–7 days',
        data: LOCATION_TTL.medium,
        backgroundColor: 'rgba(59, 130, 246, 0.72)',
        borderRadius: 2,
        barPercentage: 0.85,
      },
      {
        label: '> 7 days',
        data: LOCATION_TTL.long,
        backgroundColor: 'rgba(16, 185, 129, 0.72)',
        borderRadius: 2,
        barPercentage: 0.85,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        grid: { display: false },
        ticks: TICK,
        border: { color: '#e5e7eb' },
        title: AXIS_TITLE('Region'),
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: TICK,
        border: { display: false },
        title: AXIS_TITLE('Gists'),
      },
    },
    plugins: {
      legend: {
        labels: { color: '#6b7280', font: { size: 11 } },
      },
      tooltip: { ...TOOLTIP_BASE },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────────────

export default function TTLAnalysis() {
  const mostCommon = TTL_BUCKETS[MOST_COMMON_IDX];
  const pct = ((mostCommon.count / TOTAL) * 100).toFixed(1);

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Stat summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <StatCard
          label="Avg active lifespan"
          value={`${AVG_LIFESPAN_H} h`}
          sub="across all gists"
        />
        <StatCard
          label="Median TTL"
          value={MEDIAN_TTL_LABEL}
          sub="24-hour setting"
        />
        <StatCard
          label="Most common TTL"
          value={mostCommon.label}
          sub={`${mostCommon.count.toLocaleString()} gists · ${pct}%`}
        />
        <StatCard
          label="Total analysed"
          value={TOTAL.toLocaleString()}
          sub="gists with TTL set"
        />
      </div>

      {/* Histogram */}
      <SectionHeader>TTL distribution</SectionHeader>
      <TTLHistogram />

      {/* Most common TTL buckets table */}
      <SectionHeader>Most common TTL buckets</SectionHeader>
      <TTLBucketTable />

      {/* TTL vs engagement scatter */}
      <SectionHeader>TTL vs engagement correlation</SectionHeader>
      <TTLEngagementScatter />

      {/* Location-based TTL patterns */}
      <SectionHeader>Location-based TTL patterns</SectionHeader>
      <LocationTTLChart />
    </div>
  );
}
