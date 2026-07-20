'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export interface LatencyDataPoint {
  time: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface SLAStatus {
  target: number;
  actual: number;
  met: boolean;
}

export interface OutlierEvent {
  timestamp: string;
  latency: number;
  cause: string;
  resolved: boolean;
}

interface IndexLatencyProps {
  data?: LatencyDataPoint[];
  slaStatus?: SLAStatus;
  outliers?: OutlierEvent[];
}

const DEFAULT_DATA: LatencyDataPoint[] = Array.from({ length: 48 }, (_, i) => {
  const base = 120 + Math.sin(i * 0.3) * 40 + (i % 12 === 0 ? 80 : 0);
  return {
    time: `${Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`,
    p50: Math.round(base),
    p95: Math.round(base * 1.8),
    p99: Math.round(base * 3.2),
  };
});

const DEFAULT_SLA: SLAStatus = { target: 500, actual: 420, met: true };

const DEFAULT_OUTLIERS: OutlierEvent[] = [
  { timestamp: '2026-06-25 07:32', latency: 1850, cause: 'Soroban RPC timeout', resolved: true },
  { timestamp: '2026-06-24 19:15', latency: 2400, cause: 'Indexer backlog spike', resolved: true },
  { timestamp: '2026-06-24 08:40', latency: 1250, cause: 'DB connection pool exhaustion', resolved: true },
  { timestamp: '2026-06-23 22:10', latency: 980, cause: 'High network latency', resolved: true },
  { timestamp: '2026-06-23 14:30', latency: 3200, cause: 'Contract upgrade propagation', resolved: false },
];

export default function IndexLatency({ data = DEFAULT_DATA, slaStatus = DEFAULT_SLA, outliers = DEFAULT_OUTLIERS }: IndexLatencyProps) {
  const labels = useMemo(() => data.map((d) => d.time), [data]);

  const lineData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'P50 (ms)',
        data: data.map((d) => d.p50),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHitRadius: 6,
      },
      {
        label: 'P95 (ms)',
        data: data.map((d) => d.p95),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.05)',
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHitRadius: 6,
      },
      {
        label: 'P99 (ms)',
        data: data.map((d) => d.p99),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.05)',
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHitRadius: 6,
      },
      {
        label: `SLA Target (${slaStatus.target}ms)`,
        data: data.map(() => slaStatus.target),
        borderColor: '#6366f1',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
    ],
  }), [data, labels, slaStatus]);

  const percentileSummary = useMemo(() => ({
    p50: Math.round(data.reduce((s, d) => s + d.p50, 0) / data.length),
    p95: Math.round(data.reduce((s, d) => s + d.p95, 0) / data.length),
    p99: Math.round(data.reduce((s, d) => s + d.p99, 0) / data.length),
    max: Math.max(...data.map((d) => d.p99)),
  }), [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'P50 Latency', value: `${percentileSummary.p50}ms`, color: '#22c55e' },
          { label: 'P95 Latency', value: `${percentileSummary.p95}ms`, color: '#f59e0b' },
          { label: 'P99 Latency', value: `${percentileSummary.p99}ms`, color: '#ef4444' },
          { label: 'Peak Latency', value: `${percentileSummary.max}ms`, color: '#991b1b' },
          {
            label: 'SLA Status',
            value: slaStatus.met ? `${slaStatus.actual}ms / ${slaStatus.target}ms` : 'Breached',
            color: slaStatus.met ? '#22c55e' : '#ef4444',
          },
        ].map((m) => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Latency Trend (48-hour)</h3>
        <Line data={lineData} options={{
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              backgroundColor: 'rgba(17,24,39,0.9)',
              titleColor: '#f9fafb',
              bodyColor: '#c7d2fe',
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } },
            x: { ticks: { maxTicksLimit: 24, maxRotation: 45 } },
          },
        }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Outlier Events</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Timestamp</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Latency</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Cause</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Resolved</th>
            </tr>
          </thead>
          <tbody>
            {outliers.map((o) => (
              <tr key={o.timestamp} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: 12 }}>{o.timestamp}</td>
                <td style={{ padding: '10px', fontWeight: 700, color: o.latency > 2000 ? '#ef4444' : o.latency > 1000 ? '#f59e0b' : '#6b7280' }}>
                  {o.latency}ms
                </td>
                <td style={{ padding: '10px', color: '#374151' }}>{o.cause}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    background: o.resolved ? '#f0fdf4' : '#fef2f2',
                    color: o.resolved ? '#22c55e' : '#ef4444',
                    borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>
                    {o.resolved ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
