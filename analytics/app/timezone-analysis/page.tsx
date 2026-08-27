'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  generateMockTimezoneActivity,
  buildGlobalPeakChart,
  getTimezoneDistribution,
  computePeakHours,
  normalizeActivityByLocalTime,
} from '@/lib/timezone-normalizer';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const activity = generateMockTimezoneActivity();

const HEADER_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)',
  borderRadius: 22,
  padding: 24,
  border: '1px solid rgba(148,163,184,0.16)',
  marginBottom: 32,
};

const CARD_STYLE: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 22,
  padding: 24,
  border: '1px solid rgba(148,163,184,0.16)',
};

const KPI_STYLE: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  padding: '18px 22px',
  border: '1px solid rgba(148,163,184,0.16)',
};

export default function TimezoneAnalysisPage() {
  const [timeMode, setTimeMode] = useState<'utc' | 'local'>('utc');

  const peakData = useMemo(() => buildGlobalPeakChart(activity, timeMode), [timeMode]);
  const distribution = useMemo(() => getTimezoneDistribution(activity), []);
  const peaks = useMemo(() => computePeakHours(activity), []);
  const normalized = useMemo(() => normalizeActivityByLocalTime(activity), []);

  const peakChartData = {
    labels: peakData.labels,
    datasets: [{
      label: `Peak Activity (${timeMode.toUpperCase()})`,
      data: peakData.data,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#6366f1',
    }],
  };

  const peakChartOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
    },
  };

  const distColors = [
    '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
    '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
    '#a855f7', '#64748b', '#e11d48', '#0ea5e9', '#84cc16',
  ];

  const distData = {
    labels: distribution.map((d) => d.zone.split('/')[1]),
    datasets: [{
      data: distribution.map((d) => d.count),
      backgroundColor: distColors.slice(0, distribution.length),
      borderWidth: 0,
    }],
  };

  const distOpts = {
    responsive: true,
    cutout: '55%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12, padding: 8 } },
    },
  };

  const normHourly = {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    datasets: [{
      label: 'Normalized Activity',
      data: normalized.map((n) => n.normalizedCount),
      backgroundColor: 'rgba(34,197,94,0.6)',
      borderRadius: 3,
    }],
  };

  const normOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
    },
  };

  const totalGists = activity.reduce((s, z) => s + z.totalGists, 0);
  const topZone = distribution[0];
  const avgPeakLocal = Math.round(peaks.reduce((s, p) => s + p.localPeak, 0) / peaks.length);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={HEADER_STYLE}>
        <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800, color: '#1e293b' }}>
          Timezone Activity Analysis
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 15 }}>
          Normalize gist activity by local timezone, compare UTC vs local peak hours, and visualize global distribution.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Timezones Tracked', value: `${activity.length}` },
          { label: 'Total Gists', value: totalGists.toLocaleString() },
          { label: 'Top Region', value: topZone?.zone.split('/')[1] ?? '—' },
          { label: 'Avg Peak (Local)', value: `${String(avgPeakLocal).padStart(2, '0')}:00` },
        ].map((kpi) => (
          <div key={kpi.label} style={KPI_STYLE}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['utc', 'local'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setTimeMode(mode)}
            style={{
              padding: '7px 20px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: timeMode === mode ? '1px solid #6366f1' : '1px solid rgba(148,163,184,0.25)',
              background: timeMode === mode ? '#6366f1' : '#fff',
              color: timeMode === mode ? '#fff' : '#475569',
              cursor: 'pointer',
            }}
          >
            {mode.toUpperCase()} View
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Global Peak Hour ({timeMode.toUpperCase()} Adjusted)
          </h3>
          <Line data={peakChartData} options={peakChartOpts} height={220} />
        </div>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Timezone Distribution
          </h3>
          <Doughnut data={distData} options={distOpts} height={260} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Local-Time Normalized Activity
          </h3>
          <Bar data={normHourly} options={normOpts} height={200} />
        </div>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Peak Hour by Timezone
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(148,163,184,0.2)', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Timezone</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Offset</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>UTC Peak</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Local Peak</th>
              </tr>
            </thead>
            <tbody>
              {peaks.map((p) => (
                <tr key={p.zone} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: '#334155' }}>
                    {p.zone.split('/')[1]}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#64748b' }}>
                    UTC{p.zone.includes('Auckland') ? '+12' : `+${activity.find((z) => z.zone === p.zone)?.utcOffset}`}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#334155' }}>
                    {String(p.utcPeak).padStart(2, '0')}:00
                  </td>
                  <td style={{ padding: '7px 10px', color: '#6366f1', fontWeight: 700 }}>
                    {String(p.localPeak).padStart(2, '0')}:00
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
