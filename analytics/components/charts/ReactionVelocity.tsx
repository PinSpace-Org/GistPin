'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const REACTIONS_BY_TYPE = {
  likes: [12, 8, 5, 3, 2, 4, 10, 28, 45, 62, 78, 85, 72, 68, 90, 102, 88, 75, 58, 42, 30, 22, 16, 10],
  tips: [2, 1, 0, 0, 1, 2, 5, 12, 22, 35, 48, 52, 45, 40, 55, 62, 50, 42, 30, 20, 14, 8, 4, 2],
  comments: [1, 0, 0, 0, 0, 1, 3, 8, 14, 20, 28, 32, 26, 22, 30, 35, 28, 22, 16, 10, 6, 4, 2, 1],
  shares: [0, 0, 0, 0, 0, 0, 1, 3, 5, 8, 12, 15, 12, 10, 14, 18, 14, 10, 8, 5, 3, 2, 1, 0],
};

const PEAK_HOURS = {
  likes: { hour: 15, count: 102 },
  tips: { hour: 15, count: 62 },
  comments: { hour: 15, count: 35 },
  shares: { hour: 15, count: 18 },
};

export default function ReactionVelocity() {
  const data = {
    labels: HOURS,
    datasets: Object.entries(REACTIONS_BY_TYPE).map(([label, values], i) => ({
      label,
      data: values,
      borderColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i],
      backgroundColor: ['rgba(99,102,241,0.05)', 'rgba(16,185,129,0.05)', 'rgba(245,158,11,0.05)', 'rgba(239,68,68,0.05)'][i],
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
    })),
  };

  const peakEntries = Object.entries(PEAK_HOURS).map(([type, p]) => ({ type, ...p }));

  return (
    <div>
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Reaction Velocity — Hourly Trend', font: { size: 14 } },
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Count' } },
            x: { title: { display: true, text: 'Hour (UTC)' } },
          },
        }}
        height={100}
      />

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Peak Activity Hours</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Reaction Type</th>
              <th style={{ padding: '6px 10px' }}>Peak Hour</th>
              <th style={{ padding: '6px 10px' }}>Max Count</th>
              <th style={{ padding: '6px 10px' }}>Velocity (count/hr)</th>
            </tr>
          </thead>
          <tbody>
            {peakEntries.map((p) => (
              <tr key={p.type} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600, textTransform: 'capitalize' }}>{p.type}</td>
                <td style={{ padding: '6px 10px' }}>{p.hour}:00</td>
                <td style={{ padding: '6px 10px' }}>{p.count}</td>
                <td style={{ padding: '6px 10px' }}>{Math.round(p.count / 2)} /hr avg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
