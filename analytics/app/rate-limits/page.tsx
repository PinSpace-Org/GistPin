'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const HOURLY_HITS = [2, 1, 0, 0, 0, 1, 3, 8, 14, 18, 22, 25, 20, 28, 32, 30, 26, 24, 18, 15, 10, 6, 4, 2];
const COOLDOWN = [1, 0, 0, 0, 2, 3, 5, 4, 6, 8, 10, 7, 5, 3, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0];

const TOP_LIMITED = [
  { key: 'StellarPay',       limit: 10000, period: '1 min', hits: 9820, pct: 98.2, cooldown: '2.1s' },
  { key: 'GistFeed',         limit: 8000,  period: '1 min', hits: 7800, pct: 97.5, cooldown: '1.8s' },
  { key: 'WalletBot',        limit: 5000,  period: '1 min', hits: 4900, pct: 98.0, cooldown: '3.4s' },
  { key: 'TipJar',           limit: 5000,  period: '1 min', hits: 4200, pct: 84.0, cooldown: '0.5s' },
  { key: 'PinBoard',         limit: 3000,  period: '1 min', hits: 2850, pct: 95.0, cooldown: '1.2s' },
  { key: 'EventPulse',       limit: 3000,  period: '1 min', hits: 2100, pct: 70.0, cooldown: '0.3s' },
];

const ENDPOINT_LIMITS = [
  { route: '/api/v1/gists',      limit: 5000,  window: '1 min', throttled: 0.8 },
  { route: '/api/v1/search',     limit: 2000,  window: '1 min', throttled: 2.1 },
  { route: '/api/v1/tips',       limit: 3000,  window: '1 min', throttled: 0.3 },
  { route: '/api/v1/users',      limit: 4000,  window: '1 min', throttled: 0.1 },
  { route: '/api/v1/moderation', limit: 1000,  window: '1 min', throttled: 1.5 },
];

const ALERTS = [
  { ts: '2026-06-25 09:14', key: 'StellarPay',  action: 'Cooldown applied',   duration: '30s' },
  { ts: '2026-06-25 08:52', key: 'WalletBot',   action: 'Rate limit warning', duration: '—' },
  { ts: '2026-06-25 08:30', key: 'GistFeed',    action: 'Cooldown applied',   duration: '15s' },
  { ts: '2026-06-25 07:45', key: 'PinBoard',    action: 'Throttled',          duration: '10s' },
];

export default function RateLimitsPage() {
  const hourlyBar = {
    labels: HOURS,
    datasets: [
      {
        label: 'Rate Limit Hits',
        data: HOURLY_HITS,
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 2,
      },
      {
        label: 'Cooldowns Triggered',
        data: COOLDOWN,
        backgroundColor: 'rgba(251,191,36,0.7)',
        borderRadius: 2,
      },
    ],
  };

  const topBar = {
    labels: TOP_LIMITED.map((t) => t.key),
    datasets: [{
      label: 'Limit Utilization (%)',
      data: TOP_LIMITED.map((t) => t.pct),
      backgroundColor: TOP_LIMITED.map((t) => t.pct > 95 ? 'rgba(239,68,68,0.7)' : t.pct > 85 ? 'rgba(251,191,36,0.7)' : 'rgba(34,197,94,0.7)'),
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Rate Limit Analytics</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Tracking rate limit consumption, throttled requests, and cooldown events.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Rate Limit Events', value: '342' },
          { label: 'Active Cooldowns',         value: '2' },
          { label: 'Avg Limit Utilization',    value: '90.5%' },
          { label: 'Peak Hour (today)',        value: '13:00' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Hourly Rate Limit Hits & Cooldowns</h3>
        <Bar data={hourlyBar} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={80} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Top Consumers by Utilization</h3>
          <Bar data={topBar} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } } } }} height={80} />
          <div style={{ marginTop: 12 }}>
            {TOP_LIMITED.filter((t) => t.pct > 95).map((t) => (
              <div key={t.key} style={{ fontSize: 12, color: '#dc2626', marginBottom: 2 }}>⚠ {t.key} nearing limit</div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Consumer Details</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Key</th>
                <th style={{ padding: '6px 10px' }}>Limit</th>
                <th style={{ padding: '6px 10px' }}>Hits</th>
                <th style={{ padding: '6px 10px' }}>Util</th>
              </tr>
            </thead>
            <tbody>
              {TOP_LIMITED.map((t) => (
                <tr key={t.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.key}</td>
                  <td style={{ padding: '6px 10px' }}>{t.limit}/{t.period}</td>
                  <td style={{ padding: '6px 10px' }}>{t.hits}</td>
                  <td style={{ padding: '6px 10px', color: t.pct > 95 ? '#ef4444' : '#6b7280', fontWeight: 600 }}>{t.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Endpoint Rate Limits</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Route</th>
                <th style={{ padding: '6px 10px' }}>Limit</th>
                <th style={{ padding: '6px 10px' }}>Window</th>
                <th style={{ padding: '6px 10px' }}>Throttled %</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_LIMITS.map((e) => (
                <tr key={e.route} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 12 }}>{e.route}</td>
                  <td style={{ padding: '6px 10px' }}>{e.limit}</td>
                  <td style={{ padding: '6px 10px' }}>{e.window}</td>
                  <td style={{ padding: '6px 10px', color: e.throttled > 1 ? '#ef4444' : '#6b7280' }}>{e.throttled}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Recent Alerts</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Time</th>
                <th style={{ padding: '6px 10px' }}>Consumer</th>
                <th style={{ padding: '6px 10px' }}>Action</th>
                <th style={{ padding: '6px 10px' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {ALERTS.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px' }}>{a.ts}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{a.key}</td>
                  <td style={{ padding: '6px 10px' }}>{a.action}</td>
                  <td style={{ padding: '6px 10px' }}>{a.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
