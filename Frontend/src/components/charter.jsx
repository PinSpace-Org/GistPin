'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });
}

const labels = last7Days();
const p95 = [480, 510, 390, 620, 440, 530, 470];
const p50 = [180, 195, 160, 210, 175, 190, 185];
const p5  = [60,  65,  55,  70,  58,  63,  61];

const SLA = 200;

// Plugin: draw color zones (green < SLA, red > SLA) and SLA line
const zonesPlugin: Plugin<'line'> = {
  id: 'zones',
  beforeDraw(chart) {
    const { ctx, chartArea: a, scales } = chart;
    if (!a) return;
    const slaY = scales.y.getPixelForValue(SLA);
    // green zone (below SLA)
    ctx.fillStyle = 'rgba(34,197,94,0.06)';
    ctx.fillRect(a.left, slaY, a.width, a.bottom - slaY);
    // red zone (above SLA)
    ctx.fillStyle = 'rgba(239,68,68,0.06)';
    ctx.fillRect(a.left, a.top, a.width, slaY - a.top);
    // SLA dashed line
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.left, slaY);
    ctx.lineTo(a.right, slaY);
    ctx.stroke();
    ctx.restore();
  },
};

export default function ResponseTimeChart() {
  const data = {
    labels,
    datasets: [
      {
        label: 'p95',
        data: p95,
        borderColor: 'rgba(239,68,68,0.9)',
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.3,
      },
      {
        label: 'p50',
        data: p50,
        borderColor: 'rgba(99,102,241,0.9)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.3,
      },
      {
        label: 'p5',
        data: p5,
        borderColor: 'rgba(34,197,94,0.9)',
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          callback: (v: number | string) => `${v}ms`,
        },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'line'>) =>
            `  ${item.dataset.label}: ${item.raw}ms`,
          afterBody: () => [`  SLA target: ${SLA}ms`],
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Line data={data} options={options} plugins={[zonesPlugin]} />
    </div>
  );
}
