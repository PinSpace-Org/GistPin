'use client';

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
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const regions = ['US-East', 'US-West', 'EU-West', 'EU-Central', 'APAC', 'SA-East'];
const latency = [42, 58, 71, 65, 134, 112];
const bandwidth = [320, 280, 410, 370, 190, 140];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const failedRequests = [12, 8, 15, 6, 20, 9, 11];

const latencyData = {
  labels: regions,
  datasets: [{
    label: 'Avg Latency (ms)',
    data: latency,
    backgroundColor: latency.map(v => v < 70 ? 'rgba(34,197,94,0.75)' : v < 100 ? 'rgba(234,179,8,0.75)' : 'rgba(239,68,68,0.75)'),
    borderRadius: 4,
  }],
};

const bandwidthData = {
  labels: regions,
  datasets: [{
    label: 'Bandwidth (GB)',
    data: bandwidth,
    backgroundColor: 'rgba(59,130,246,0.75)',
    borderRadius: 4,
  }],
};

const cdnData = {
  labels: ['CDN Hit', 'Cache Miss'],
  datasets: [{
    data: [78, 22],
    backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(226,232,240,0.8)'],
    borderWidth: 0,
  }],
};

const failedData = {
  labels: days,
  datasets: [{
    label: 'Failed Requests',
    data: failedRequests,
    borderColor: 'rgba(239,68,68,1)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    tension: 0.4,
    fill: true,
    pointRadius: 4,
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

const lineOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
};

const doughnutOpts = {
  responsive: true,
  cutout: '70%',
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280' } } },
};

export default function NetworkPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Network Performance</h1>
        <p style={{ margin: 0, color: '#475569' }}>Latency, bandwidth, CDN efficiency, and error tracking across regions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Avg Global Latency', value: '76 ms', sub: '↓ 8% vs last week' },
          { label: 'Total Bandwidth', value: '1.71 TB', sub: '↑ 12% vs last week' },
          { label: 'CDN Hit Rate', value: '78%', sub: '↑ 3% vs last week' },
          { label: 'Failed Requests', value: '81', sub: '↓ 5% vs last week' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 700 }}>{value}</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Latency by Region (ms)</h2>
          <Bar data={latencyData} options={barOpts} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Bandwidth Usage by Region (GB)</h2>
          <Bar data={bandwidthData} options={barOpts} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>CDN Hit Rate</h2>
          <div style={{ maxWidth: 260, margin: '0 auto' }}>
            <Doughnut data={cdnData} options={doughnutOpts} />
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Failed Requests (This Week)</h2>
          <Line data={failedData} options={lineOpts} />
        </div>
      </div>
    </main>
  );
}
