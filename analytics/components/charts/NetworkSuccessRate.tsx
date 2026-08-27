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
import { Bar, Line, Scatter } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const NETWORK_CONDITIONS = ['Excellent', 'Good', 'Moderate', 'Poor', 'Critical'];

const successByFeeData = {
  datasets: [
    {
      label: 'Successful Posts',
      data: [
        { x: 0.001, y: 98.2 }, { x: 0.005, y: 97.8 }, { x: 0.01, y: 96.5 },
        { x: 0.02, y: 95.1 }, { x: 0.05, y: 93.8 }, { x: 0.1, y: 91.2 },
        { x: 0.2, y: 88.5 }, { x: 0.5, y: 82.3 }, { x: 1.0, y: 75.6 },
      ],
      backgroundColor: 'rgba(34,197,94,0.7)',
      pointRadius: 6,
    },
    {
      label: 'Failed Posts',
      data: [
        { x: 0.001, y: 1.8 }, { x: 0.005, y: 2.2 }, { x: 0.01, y: 3.5 },
        { x: 0.02, y: 4.9 }, { x: 0.05, y: 6.2 }, { x: 0.1, y: 8.8 },
        { x: 0.2, y: 11.5 }, { x: 0.5, y: 17.7 }, { x: 1.0, y: 24.4 },
      ],
      backgroundColor: 'rgba(239,68,68,0.7)',
      pointRadius: 6,
    },
  ],
};

const successByLedgerTime = {
  labels: ['<1s', '1-3s', '3-5s', '5-10s', '10-20s', '20-30s', '30-60s', '>60s'],
  datasets: [
    {
      label: 'Success Rate (%)',
      data: [99.1, 98.4, 96.7, 93.2, 87.5, 79.8, 68.4, 52.1],
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: 'rgba(99,102,241,1)',
    },
  ],
};

const conditionBuckets = {
  labels: NETWORK_CONDITIONS,
  datasets: [
    {
      label: 'Total Posts',
      data: [12450, 8320, 4210, 1890, 640],
      backgroundColor: 'rgba(99,102,241,0.7)',
      borderRadius: 4,
    },
    {
      label: 'Successful',
      data: [12310, 8180, 3980, 1620, 420],
      backgroundColor: 'rgba(34,197,94,0.7)',
      borderRadius: 4,
    },
  ],
};

const failureReasons = [
  { reason: 'Insufficient Balance', count: 842, pct: 34.1 },
  { reason: 'Network Timeout', count: 618, pct: 25.0 },
  { reason: 'Fee Too Low', count: 412, pct: 16.7 },
  { reason: 'Nonce Collision', count: 298, pct: 12.1 },
  { reason: 'Rate Limit Exceeded', count: 189, pct: 7.7 },
  { reason: 'Account Not Found', count: 112, pct: 4.5 },
];

const retryData = {
  labels: ['1st Attempt', '2nd Attempt', '3rd Attempt', '4th Attempt', '5th+ Attempt'],
  datasets: [{
    label: 'Retry Success Rate (%)',
    data: [89.3, 94.1, 96.8, 98.2, 99.1],
    backgroundColor: ['rgba(239,68,68,0.7)', 'rgba(234,179,8,0.7)', 'rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)', 'rgba(16,185,129,0.7)'],
    borderRadius: 4,
  }],
};

const scatterOpts = {
  responsive: true,
  scales: {
    x: { title: { display: true, text: 'Network Fee (XLM)', color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } },
    y: { title: { display: true, text: 'Success Rate (%)', color: '#6b7280' }, min: 50, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12 } } },
};

const barOpts = {
  responsive: true,
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12 } } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
};

const lineOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: false, min: 40, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number) => v + '%' }, border: { display: false } },
  },
};

export default function NetworkSuccessRate() {
  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Success Rate vs Network Fee</h3>
          <Scatter data={successByFeeData} options={scatterOpts} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>Higher fees correlate with lower success rates due to balance depletion.</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Success Rate vs Ledger Time</h3>
          <Line data={successByLedgerTime} options={lineOpts} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>Posts taking over 10s drop below 90% success rate.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Posts by Network Condition</h3>
          <Bar data={conditionBuckets} options={barOpts} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Retry Success Rate</h3>
          <Bar data={retryData} options={barOpts} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Failed Post Analysis</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Failure Reason</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Count</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Share</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {failureReasons.map((r) => (
                <tr key={r.reason} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.reason}</td>
                  <td style={{ padding: '8px 12px' }}>{r.count.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px' }}>{r.pct}%</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8, width: '100%', maxWidth: 120 }}>
                      <div style={{ background: r.pct > 20 ? '#ef4444' : r.pct > 10 ? '#eab308' : '#6366f1', borderRadius: 4, height: 8, width: `${r.pct * 3}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
