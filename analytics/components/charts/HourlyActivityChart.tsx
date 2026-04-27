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
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { memo, useMemo } from 'react';
import { COLORS } from '@/lib/chart-config';
import ChartWrapper from './ChartWrapper';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

function mockHourlyData() {
  // Simulate low activity at night, peaks at 9am and 8pm
  return HOURS.map((_, h) => {
    const base = h >= 8 && h <= 22 ? 60 + Math.sin(((h - 8) / 14) * Math.PI) * 120 : 10;
    return Math.round(base + (Math.random() - 0.5) * 30);
  });
}

function HourlyActivityChart() {
  const counts = useMemo(() => mockHourlyData(), []);
  const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
  const peak = Math.max(...counts);

  const barColors = counts.map((v) =>
    v === peak ? 'rgba(239,68,68,0.85)' : `rgba(99,102,241,${0.4 + (v / peak) * 0.5})`
  );

  const data = {
    labels: HOURS,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Activity',
        data: counts,
        backgroundColor: barColors,
        borderRadius: 4,
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Average',
        data: Array(24).fill(avg),
        borderColor: 'rgba(251,146,60,0.9)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: COLORS.tick,
          font: { size: 10 },
          callback: (_: unknown, i: number) => (i % 3 === 0 ? HOURS[i] : ''),
        },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: COLORS.grid },
        ticks: { color: COLORS.tick, font: { size: 11 } },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#374151', font: { size: 12 }, boxWidth: 14 },
      },
      tooltip: {
        backgroundColor: COLORS.tooltipBg,
        titleColor: COLORS.tooltipTitle,
        bodyColor: COLORS.tooltipBody,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'bar'>) =>
            item.datasetIndex === 0
              ? `  Activity: ${item.raw}`
              : `  Avg: ${avg}`,
        },
      },
    },
  };

  return (
    <ChartWrapper title="Hourly Activity">
      <Bar data={data as Parameters<typeof Bar>[0]['data']} options={options} />
    </ChartWrapper>
  );
}

export default memo(HourlyActivityChart);
