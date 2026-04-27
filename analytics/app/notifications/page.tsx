'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const openRateByHour = [2,1,1,1,2,4,8,14,18,22,20,17,15,16,19,21,18,14,11,9,7,5,4,3];

const funnelData = {
  labels: ['Sent', 'Delivered', 'Opened', 'Clicked'],
  datasets: [{
    label: 'Notifications',
    data: [100000, 94200, 38600, 12400],
    backgroundColor: [
      'rgba(99,102,241,0.8)',
      'rgba(59,130,246,0.8)',
      'rgba(34,197,94,0.8)',
      'rgba(234,179,8,0.8)',
    ],
    borderRadius: 4,
  }],
};

const channelData = {
  labels: ['Email', 'Push'],
  datasets: [
    { label: 'Sent', data: [62000, 38000], backgroundColor: 'rgba(99,102,241,0.8)', borderRadius: 4 },
    { label: 'Delivered', data: [58400, 35800], backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 4 },
    { label: 'Opened', data: [21200, 17400], backgroundColor: 'rgba(34,197,94,0.8)', borderRadius: 4 },
  ],
};

const bestTimeData = {
  labels: hours,
  datasets: [{
    label: 'Open Rate (%)',
    data: openRateByHour,
    borderColor: 'rgba(99,102,241,1)',
    backgroundColor: 'rgba(99,102,241,0.1)',
    tension: 0.4,
    fill: true,
    pointRadius: 2,
  }],
};

const barOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
};

const groupedBarOpts = {
  responsive: true,
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280' } } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
};

const lineOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 8 } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: unknown) => `${v}%` }, border: { display: false } },
  },
};

export default function NotificationsPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Notification Analytics</h1>
        <p style={{ margin: 0, color: '#475569' }}>Delivery funnel, best send times, and channel performance comparison.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Sent', value: '100,000', pct: '100%' },
          { label: 'Delivered', value: '94,200', pct: '94.2%' },
          { label: 'Opened', value: '38,600', pct: '38.6%' },
          { label: 'Clicked', value: '12,400', pct: '12.4%' },
        ].map(({ label, value, pct }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700 }}>{value}</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{pct} of sent</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Delivery Funnel</h2>
          <Bar data={funnelData} options={barOpts} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Channel Comparison (Email vs Push)</h2>
          <Bar data={channelData} options={groupedBarOpts} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Best Time to Send (Open Rate by Hour)</h2>
        <Line data={bestTimeData} options={lineOpts} />
      </div>
    </main>
  );
}
