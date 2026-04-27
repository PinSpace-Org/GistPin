'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const pages = [
  { page: '/home', pct25: 98, pct50: 82, pct75: 61, pct100: 34, avg: 68 },
  { page: '/explore', pct25: 95, pct50: 74, pct75: 52, pct100: 28, avg: 59 },
  { page: '/gist/:id', pct25: 91, pct50: 70, pct75: 48, pct100: 22, avg: 55 },
  { page: '/profile', pct25: 88, pct50: 65, pct75: 40, pct100: 18, avg: 50 },
  { page: '/map', pct25: 85, pct50: 58, pct75: 35, pct100: 14, avg: 46 },
];

const avgScrollDepth = Math.round(pages.reduce((s, p) => s + p.avg, 0) / pages.length);

export default function ScrollDepth() {
  const data = {
    labels: pages.map((p) => p.page),
    datasets: [
      { label: '25%', data: pages.map((p) => p.pct25), backgroundColor: 'rgba(59,130,246,0.85)', borderRadius: 3 },
      { label: '50%', data: pages.map((p) => p.pct50), backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 3 },
      { label: '75%', data: pages.map((p) => p.pct75), backgroundColor: 'rgba(245,158,11,0.85)', borderRadius: 3 },
      { label: '100%', data: pages.map((p) => p.pct100), backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 3 },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    scales: {
      x: {
        max: 100,
        ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}%` },
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        title: { display: true, text: '% of users reaching depth', color: '#6b7280', font: { size: 12 } },
      },
      y: { ticks: { color: '#9ca3af' }, grid: { display: false }, border: { color: '#e5e7eb' } },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#374151', font: { size: 12 } } },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (item: TooltipItem<'bar'>) => ` ${item.dataset.label} depth: ${item.raw}% of users` },
      },
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 20px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Avg Scroll Depth</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>{avgScrollDepth}%</div>
        </div>
      </div>
      <Bar data={data} options={options} />
    </div>
  );
}
