'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

const ACTION_DATA = {
  labels: WEEKS,
  datasets: [
    {
      label: 'Removed',
      data: [12, 19, 8, 15],
      backgroundColor: 'rgba(239,68,68,0.7)',
    },
    {
      label: 'Warned',
      data: [7, 11, 14, 9],
      backgroundColor: 'rgba(251,191,36,0.7)',
    },
    {
      label: 'Approved',
      data: [34, 28, 41, 37],
      backgroundColor: 'rgba(34,197,94,0.7)',
    },
  ],
};

const STATS = [
  { label: 'Total Reports', value: 284 },
  { label: 'Resolved', value: 231 },
  { label: 'Pending', value: 53 },
  { label: 'Avg Resolution (hrs)', value: '3.4' },
];

export default function ModerationAnalytics() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Moderation Analytics
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          Moderation Actions by Week
        </h3>
        <Bar
          data={ACTION_DATA}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { x: { stacked: false }, y: { beginAtZero: true } },
          }}
        />
      </div>
    </div>
  );
}
