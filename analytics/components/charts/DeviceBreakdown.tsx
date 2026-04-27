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
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const deviceData = {
  labels: ['Mobile', 'Desktop', 'Tablet'],
  datasets: [{
    data: [54, 38, 8],
    backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(59,130,246,0.8)', 'rgba(234,179,8,0.8)'],
    borderWidth: 0,
  }],
};

const browserData = {
  labels: ['Chrome 124', 'Safari 17', 'Firefox 125', 'Edge 124', 'Other'],
  datasets: [{
    label: 'Users (%)',
    data: [48, 27, 11, 9, 5],
    backgroundColor: 'rgba(99,102,241,0.75)',
    borderRadius: 4,
  }],
};

const osData = {
  labels: ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
  datasets: [{
    label: 'Users (%)',
    data: [31, 23, 26, 15, 5],
    backgroundColor: 'rgba(59,130,246,0.75)',
    borderRadius: 4,
  }],
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const trendData = {
  labels: months,
  datasets: [
    {
      label: 'Mobile',
      data: [48, 50, 51, 53, 54, 54],
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.4,
      fill: true,
    },
    {
      label: 'Desktop',
      data: [44, 42, 41, 39, 38, 38],
      borderColor: 'rgba(59,130,246,1)',
      backgroundColor: 'rgba(59,130,246,0.1)',
      tension: 0.4,
      fill: true,
    },
  ],
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
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280' } } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: unknown) => `${v}%` }, border: { display: false } },
  },
};

export default function DeviceBreakdown() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Device Type</h2>
        <div style={{ maxWidth: 260, margin: '0 auto' }}>
          <Pie data={deviceData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#6b7280' } } } }} />
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Browser Version</h2>
        <Bar data={browserData} options={barOpts} />
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>OS Distribution</h2>
        <Bar data={osData} options={barOpts} />
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Mobile vs Desktop Trend</h2>
        <Line data={trendData} options={lineOpts} />
      </div>
    </div>
  );
}
