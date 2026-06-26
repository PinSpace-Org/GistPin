'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Generate 60 minutes of mock posts-per-minute data
function generateVelocityData() {
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => {
    const t = new Date(now - (59 - i) * 60_000);
    const label = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const base = 8 + Math.sin(i * 0.2) * 4;
    const spike = (i === 22 || i === 47) ? 28 : 0;
    const ppm = Math.max(0, Math.round(base + spike + (Math.random() - 0.5) * 4));
    return { label, ppm };
  });
}

function movingAverage(data: number[], window = 5): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

const SPIKE_THRESHOLD = 20;

export default function VelocityChart() {
  const points = useMemo(() => generateVelocityData(), []);
  const ppm    = points.map((p) => p.ppm);
  const labels = points.map((p) => p.label);
  const avg    = movingAverage(ppm);

  // Spike background plugin
  const spikePoints = ppm.map((v) => (v >= SPIKE_THRESHOLD ? v : null));

  const data = {
    labels,
    datasets: [
      {
        label: 'Posts/min',
        data: ppm,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: ppm.map((v) => (v >= SPIKE_THRESHOLD ? 5 : 0)),
        pointBackgroundColor: ppm.map((v) => (v >= SPIKE_THRESHOLD ? '#ef4444' : '#6366f1')),
        pointBorderColor: ppm.map((v) => (v >= SPIKE_THRESHOLD ? '#ef4444' : '#6366f1')),
        order: 2,
      },
      {
        label: 'Moving avg (5m)',
        data: avg,
        borderColor: '#f59e0b',
        borderDash: [5, 3],
        pointRadius: 0,
        fill: false,
        tension: 0.4,
        order: 1,
      },
      {
        label: 'Spike',
        data: spikePoints,
        borderColor: 'transparent',
        backgroundColor: 'rgba(239,68,68,0.15)',
        pointBackgroundColor: '#ef4444',
        pointRadius: 6,
        pointBorderColor: '#ef4444',
        fill: false,
        order: 0,
        type: 'line' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', maxTicksLimit: 10, font: { size: 11 } },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: number | string) => `${v} ppm` },
        border: { display: false },
      },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16, filter: (item: { text: string }) => item.text !== 'Spike' } },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'line'>) => `  ${item.dataset.label}: ${item.raw} ppm`,
          afterBody: (items: TooltipItem<'line'>[]) => {
            const v = items[0]?.raw as number;
            return v >= SPIKE_THRESHOLD ? ['  ⚠ Spike detected'] : [];
          },
        },
      },
    },
  };

  function handleExport() {
    const csv = ['Time,Posts/min,MovingAvg',
      ...points.map((p, i) => `${p.label},${p.ppm},${avg[i]}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'velocity.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentPpm  = ppm[ppm.length - 1];
  const spikesCount = ppm.filter((v) => v >= SPIKE_THRESHOLD).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Current',    value: `${currentPpm} ppm`,  color: '#6366f1' },
          { label: 'Peak (1h)',  value: `${Math.max(...ppm)} ppm`, color: '#22c55e' },
          { label: 'Avg (1h)',   value: `${avg[avg.length - 1]} ppm`, color: '#f59e0b' },
          { label: 'Spikes',     value: spikesCount.toString(), color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: '1 1 140px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' }}>
        <Line data={data} options={options} />
      </div>

      {/* Export */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExport}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
    </div>
  );
}
