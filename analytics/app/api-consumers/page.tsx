'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const CONSUMERS = ['StellarPay', 'GistFeed', 'WalletBot', 'TipJar', 'PinBoard', 'EventPulse', 'SafetyNet', 'FoodCrawl'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const REQUESTS_PER_KEY = [142000, 98000, 51000, 47000, 33000, 28000, 19000, 12000];
const GROWTH = [
  [10, 12, 15, 18, 22, 25],
  [8, 9, 11, 14, 16, 19],
  [5, 6, 7, 8, 10, 12],
  [4, 5, 6, 7, 8, 9],
  [3, 4, 4, 5, 6, 7],
  [2, 3, 3, 4, 5, 6],
  [2, 2, 3, 3, 4, 4],
  [1, 1, 2, 2, 3, 3],
];

const ENDPOINTS = [
  { path: '/api/v1/gists',        requests: 320000, avgMs: 45,  errPct: 0.8 },
  { path: '/api/v1/search',       requests: 210000, avgMs: 120, errPct: 1.5 },
  { path: '/api/v1/tips',         requests: 98000,  avgMs: 60,  errPct: 0.5 },
  { path: '/api/v1/users',        requests: 76000,  avgMs: 35,  errPct: 0.3 },
  { path: '/api/v1/categories',   requests: 45000,  avgMs: 30,  errPct: 0.2 },
  { path: '/api/v1/moderation',   requests: 32000,  avgMs: 80,  errPct: 2.1 },
];

const RATE_LIMITS = [
  { key: 'StellarPay', hits: 34, limit: 10000, period: '1 min' },
  { key: 'GistFeed',   hits: 28, limit: 8000,  period: '1 min' },
  { key: 'WalletBot',  hits: 12, limit: 5000,  period: '1 min' },
  { key: 'TipJar',     hits: 8,  limit: 5000,  period: '1 min' },
];

const CONSUMER_INFO = [
  { name: 'StellarPay', type: 'Mobile App',    dailyActive: '4,200',  p99Ms: 210, owner: 'Payments Team' },
  { name: 'GistFeed',   type: 'Web App',       dailyActive: '3,800',  p99Ms: 185, owner: 'Core Team' },
  { name: 'WalletBot',  type: 'Telegram Bot',  dailyActive: '1,200',  p99Ms: 320, owner: 'Bots Team' },
  { name: 'TipJar',     type: 'Mobile App',    dailyActive: '980',    p99Ms: 150, owner: 'Payments Team' },
  { name: 'PinBoard',   type: 'Chrome Ext',    dailyActive: '750',    p99Ms: 280, owner: 'Core Team' },
  { name: 'EventPulse', type: 'Web App',       dailyActive: '620',    p99Ms: 195, owner: 'Events Team' },
  { name: 'SafetyNet',  type: 'Mobile App',    dailyActive: '410',    p99Ms: 250, owner: 'Safety Team' },
  { name: 'FoodCrawl',  type: 'Web App',       dailyActive: '310',    p99Ms: 175, owner: 'Food Team' },
];

export default function ApiConsumersPage() {
  const reqBar = {
    labels: CONSUMERS,
    datasets: [{
      label: 'Total Requests',
      data: REQUESTS_PER_KEY,
      backgroundColor: 'rgba(59,130,246,0.7)',
      borderRadius: 3,
    }],
  };

  const growthData = {
    labels: MONTHS,
    datasets: CONSUMERS.slice(0, 4).map((name, i) => ({
      label: name,
      data: GROWTH[i],
      borderColor: ['rgba(59,130,246,1)', 'rgba(34,197,94,1)', 'rgba(251,191,36,1)', 'rgba(239,68,68,1)'][i],
      tension: 0.3,
      pointRadius: 3,
    })),
  };

  const epBar = {
    labels: ENDPOINTS.map((e) => e.path),
    datasets: [
      {
        label: 'Total Requests',
        data: ENDPOINTS.map((e) => e.requests),
        backgroundColor: 'rgba(99,102,241,0.7)',
        yAxisID: 'y',
        borderRadius: 3,
      },
      {
        label: 'Avg Latency (ms)',
        data: ENDPOINTS.map((e) => e.avgMs),
        backgroundColor: 'rgba(239,68,68,0.7)',
        yAxisID: 'y1',
        borderRadius: 3,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>API Consumer Analytics</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Per-key usage, endpoint breakdown, and rate-limit tracking.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Consumers', value: '8' },
          { label: 'Total Monthly Req', value: '430K' },
          { label: 'Avg Latency', value: '68 ms' },
          { label: 'Rate Limit Events', value: '82' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Requests per Consumer Key</h3>
          <Bar data={reqBar} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Monthly Growth (Top 4)</h3>
          <Line data={growthData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Endpoint Usage & Latency</h3>
        <Bar data={epBar} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Requests' } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'ms' } },
          },
        }} height={80} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Rate Limit Hits</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Key</th>
                <th style={{ padding: '6px 10px' }}>Hits</th>
                <th style={{ padding: '6px 10px' }}>Limit</th>
                <th style={{ padding: '6px 10px' }}>Period</th>
              </tr>
            </thead>
            <tbody>
              {RATE_LIMITS.map((r) => (
                <tr key={r.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.key}</td>
                  <td style={{ padding: '6px 10px', color: r.hits > 20 ? '#ef4444' : '#6b7280' }}>{r.hits}</td>
                  <td style={{ padding: '6px 10px' }}>{r.limit.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px' }}>{r.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Consumer Leaderboard</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Name</th>
                <th style={{ padding: '6px 10px' }}>Type</th>
                <th style={{ padding: '6px 10px' }}>Daily Active</th>
                <th style={{ padding: '6px 10px' }}>P99 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {CONSUMER_INFO.map((c) => (
                <tr key={c.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '6px 10px' }}>{c.type}</td>
                  <td style={{ padding: '6px 10px' }}>{c.dailyActive}</td>
                  <td style={{ padding: '6px 10px' }}>{c.p99Ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
