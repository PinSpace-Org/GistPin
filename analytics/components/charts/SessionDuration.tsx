'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const buckets = [
  { range: '0–1 min',   users: 1240 },
  { range: '1–2 min',   users: 2870 },
  { range: '2–5 min',   users: 4310 },
  { range: '5–10 min',  users: 3890 },
  { range: '10–20 min', users: 2540 },
  { range: '20–30 min', users: 1180 },
  { range: '30–60 min', users:  640 },
  { range: '60+ min',   users:  230 },
];

// Weighted average: midpoint seconds per bucket
const midpoints = [30, 90, 210, 450, 900, 1500, 2700, 4500];
const totalUsers = buckets.reduce((s, b) => s + b.users, 0);
const avgSeconds = Math.round(
  buckets.reduce((s, b, i) => s + b.users * midpoints[i], 0) / totalUsers,
);
const avgLabel = avgSeconds < 60 ? `${avgSeconds}s` : `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`;

// Median bucket index (cumulative)
let cumulative = 0;
let medianIdx = 0;
for (let i = 0; i < buckets.length; i++) {
  cumulative += buckets[i].users;
  if (cumulative >= totalUsers / 2) { medianIdx = i; break; }
}

export default function SessionDuration() {
  const data = {
    labels: buckets.map((b) => b.range),
    datasets: [
      {
        label: 'Users',
        data: buckets.map((b) => b.users),
        backgroundColor: buckets.map((_, i) =>
          i === medianIdx ? 'rgba(251, 191, 36, 0.85)' : 'rgba(99, 102, 241, 0.75)',
        ),
        borderColor: buckets.map((_, i) =>
          i === medianIdx ? 'rgba(251, 191, 36, 1)' : 'rgba(99, 102, 241, 1)',
        ),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.9,
        categoryPercentage: 0.85,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const pct = ((item.raw as number) / totalUsers * 100).toFixed(1);
            return `  ${(item.raw as number).toLocaleString()} users (${pct}%)`;
          },
          afterLabel: (_: TooltipItem<'bar'>) =>
            _ .dataIndex === medianIdx ? '  ← median bucket' : '',
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        title: { display: true, text: 'Session duration', color: '#6b7280', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { display: false },
        title: { display: true, text: 'Users', color: '#6b7280', font: { size: 12 } },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Total sessions </span>
            <span className="font-semibold">{totalUsers.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Avg duration </span>
            <span className="font-semibold">{avgLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" />
            <span className="text-gray-500">Median bucket: </span>
            <span className="font-semibold">{buckets[medianIdx].range}</span>
          </div>
        </div>
        <ExportButton
          onExport={(onProgress) =>
            exportRowsToCsv({
              filenamePrefix: 'session-duration',
              rows: buckets.map((b) => ({ bucket: b.range, users: b.users })),
              onProgress,
            })
          }
        />
      </div>

      <Bar data={data} options={options} />
    </div>
  );
}
