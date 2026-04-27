'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const resources = [
  { name: 'document', type: 'Document', dns: 10, tcp: 20, download: 80 },
  { name: 'main.js', type: 'Script', dns: 0, tcp: 5, download: 120 },
  { name: 'styles.css', type: 'Stylesheet', dns: 0, tcp: 5, download: 40 },
  { name: 'logo.png', type: 'Image', dns: 0, tcp: 8, download: 55 },
  { name: 'map-tiles', type: 'XHR', dns: 5, tcp: 12, download: 200 },
  { name: 'analytics.js', type: 'Script', dns: 0, tcp: 6, download: 90 },
  { name: 'font.woff2', type: 'Font', dns: 0, tcp: 5, download: 30 },
];

const typeColors: Record<string, string> = {
  Document: 'rgba(59,130,246,0.85)',
  Script: 'rgba(245,158,11,0.85)',
  Stylesheet: 'rgba(16,185,129,0.85)',
  Image: 'rgba(168,85,247,0.85)',
  XHR: 'rgba(239,68,68,0.85)',
  Font: 'rgba(20,184,166,0.85)',
};

const totalLoad = Math.max(...resources.map((r) => r.dns + r.tcp + r.download));

export default function WaterfallChart() {
  const labels = resources.map((r) => r.name);

  const data = {
    labels,
    datasets: [
      {
        label: 'DNS',
        data: resources.map((r) => r.dns),
        backgroundColor: resources.map((r) => typeColors[r.type]),
        borderRadius: 2,
        stack: 'waterfall',
      },
      {
        label: 'TCP',
        data: resources.map((r) => r.tcp),
        backgroundColor: resources.map((r) => typeColors[r.type].replace('0.85', '0.55')),
        borderRadius: 2,
        stack: 'waterfall',
      },
      {
        label: 'Download',
        data: resources.map((r) => r.download),
        backgroundColor: resources.map((r) => typeColors[r.type].replace('0.85', '0.35')),
        borderRadius: 2,
        stack: 'waterfall',
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}ms` },
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        title: { display: true, text: 'Time (ms)', color: '#6b7280', font: { size: 12 } },
      },
      y: { stacked: true, ticks: { color: '#9ca3af' }, grid: { display: false }, border: { color: '#e5e7eb' } },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#374151', font: { size: 12 } } },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => ` ${item.dataset.label}: ${item.raw}ms`,
          footer: (items: TooltipItem<'bar'>[]) => {
            const r = resources[items[0].dataIndex];
            return `Total: ${r.dns + r.tcp + r.download}ms | Type: ${r.type}`;
          },
        },
      },
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 20px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>Total Load Time</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a' }}>{totalLoad}ms</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 20px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Resources</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>{resources.length}</div>
        </div>
      </div>
      <Bar data={data} options={options} />
    </div>
  );
}
