'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const LAG_LEDGERS = [12, 8, 5, 3, 2, 4, 7, 15, 22, 18, 14, 10, 8, 6, 9, 13, 20, 28, 25, 18, 12, 8, 6, 4];
const LAG_SECONDS = LAG_LEDGERS.map((l) => l * 5);

const CATCH_UP_RATES = [
  { period: 'Last 5 min', ledgersProcessed: 85, avgPerSec: 0.28 },
  { period: 'Last 15 min', ledgersProcessed: 240, avgPerSec: 0.27 },
  { period: 'Last 30 min', ledgersProcessed: 460, avgPerSec: 0.26 },
  { period: 'Last 1 hour', ledgersProcessed: 890, avgPerSec: 0.25 },
  { period: 'Last 6 hours', ledgersProcessed: 4800, avgPerSec: 0.22 },
];

const INCIDENTS = [
  { ts: '2026-06-25 07:32', lag: 45, ledgers: 225, duration: '18 min', resolved: true },
  { ts: '2026-06-24 19:15', lag: 62, ledgers: 310, duration: '32 min', resolved: true },
  { ts: '2026-06-24 08:40', lag: 38, ledgers: 190, duration: '14 min', resolved: true },
  { ts: '2026-06-23 22:10', lag: 28, ledgers: 140, duration: '8 min',  resolved: true },
];

export default function IndexerHealthPage() {
  const currentLag = LAG_LEDGERS[LAG_LEDGERS.length - 1];
  const currentSec = LAG_SECONDS[LAG_SECONDS.length - 1];

  const chartData = {
    labels: HOURS,
    datasets: [
      {
        label: 'Lag (ledgers)',
        data: LAG_LEDGERS,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y',
      },
      {
        label: 'Lag (seconds)',
        data: LAG_SECONDS,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y1',
      },
    ],
  };

  const catchUpData = {
    labels: CATCH_UP_RATES.map((c) => c.period),
    datasets: [{
      label: 'Ledgers Processed',
      data: CATCH_UP_RATES.map((c) => c.ledgersProcessed),
      backgroundColor: 'rgba(34,197,94,0.7)',
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Indexer Lag Monitor</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Track indexer lag behind the latest Soroban ledger.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Current Lag',          value: `${currentLag} ledgers` },
          { label: 'Est. Time Behind',     value: `${currentSec}s` },
          { label: 'Alert Threshold',      value: '30 ledgers' },
          { label: 'Status',              value: currentLag < 30 ? 'Healthy' : 'Degraded' },
        ].map((kpi, i) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: i === 3 ? (currentLag < 30 ? '#22c55e' : '#ef4444') : '#111827' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>24-Hour Lag Trend</h3>
          <Line data={chartData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Ledgers' } },
              y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Seconds' } },
            },
          }} height={80} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Catch-Up Rate</h3>
          <Bar data={catchUpData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={80} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Historical Lag Incidents</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Timestamp</th>
              <th style={{ padding: '8px 12px' }}>Lag (ledgers)</th>
              <th style={{ padding: '8px 12px' }}>Lag (seconds)</th>
              <th style={{ padding: '8px 12px' }}>Duration</th>
              <th style={{ padding: '8px 12px' }}>Resolved</th>
            </tr>
          </thead>
          <tbody>
            {INCIDENTS.map((inc) => (
              <tr key={inc.ts} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px' }}>{inc.ts}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{inc.lag}</td>
                <td style={{ padding: '8px 12px' }}>{inc.ledgers}</td>
                <td style={{ padding: '8px 12px' }}>{inc.duration}</td>
                <td style={{ padding: '8px 12px', color: inc.resolved ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {inc.resolved ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
