'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import type { Plugin, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { memo, useMemo } from 'react';
import { baseOptions } from '@/lib/chart-config';
import ChartWrapper from './ChartWrapper';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface DayPoint {
  label: string;
  fullLabel: string;
  count: number;
}

function generateLast30Days(): DayPoint[] {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86_400_000);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const count = Math.round(Math.min(200, Math.max(50, 100 + i * 1.5 + (Math.random() - 0.5) * 50 - (isWeekend ? 20 : 0))));
    return {
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      fullLabel: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      count,
    };
  });
}

const gradientPlugin: Plugin<'line'> = {
  id: 'dailyGistsGradient',
  afterLayout(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    grad.addColorStop(0, 'rgba(99,102,241,0.45)');
    grad.addColorStop(1, 'rgba(99,102,241,0.02)');
    chart.data.datasets[0].backgroundColor = grad;
  },
};

function DailyGistsChart() {
  const points = useMemo(() => generateLast30Days(), []);
  const labels = points.map((p) => p.label);
  const fullLabels = points.map((p) => p.fullLabel);

  const data = {
    labels: labels.map((l, i) => (i % 5 === 0 || i === 29 ? l : null)),
    datasets: [{
      label: 'Gists created',
      data: points.map((p) => p.count),
      borderColor: 'rgba(99,102,241,0.9)',
      borderWidth: 2.5,
      backgroundColor: 'rgba(99,102,241,0.35)',
      fill: true,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#6366f1',
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
    }],
  };

  const options = baseOptions({
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, color: '#9ca3af', font: { size: 11 } }, border: { color: '#e5e7eb' } },
      y: { beginAtZero: false, suggestedMin: 30, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 50 }, border: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#c7d2fe',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => fullLabels[items[0].dataIndex],
          label: (item: TooltipItem<'line'>) => `  ${(item.raw as number).toLocaleString()} gists`,
        },
      },
    },
  });

  return (
    <ChartWrapper title="Daily Gists (Last 30 Days)">
      <Line data={data} options={options} plugins={[gradientPlugin]} />
    </ChartWrapper>
  );
}

export default memo(DailyGistsChart);
