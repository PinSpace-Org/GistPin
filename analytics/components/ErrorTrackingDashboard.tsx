'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface ErrorSummary {
  id: string;
  type: string;
  message: string;
  count: number;
  trend: number[];
}

const ERRORS: ErrorSummary[] = [
  { id: 'e1', type: 'TypeError',    message: "Cannot read property 'id' of undefined", count: 54, trend: [3,5,4,8,6,9,7] },
  { id: 'e2', type: 'NetworkError', message: 'Failed to fetch /api/gists',              count: 31, trend: [2,4,3,5,4,3,5] },
  { id: 'e3', type: 'RangeError',   message: 'Maximum call stack exceeded',             count: 12, trend: [1,2,1,1,3,2,1] },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ErrorTrackingDashboard() {
  const [selected, setSelected] = useState<ErrorSummary>(ERRORS[0]);

  const chartData = {
    labels: DAYS,
    datasets: [
      {
        label: selected.type,
        data: selected.trend,
        borderColor: 'rgba(239,68,68,1)',
        backgroundColor: 'rgba(239,68,68,0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Error Tracking Dashboard
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {ERRORS.map((err) => (
          <button
            key={err.id}
            onClick={() => setSelected(err)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-all ${
              selected.id === err.id
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <p className="text-xs font-semibold text-red-500">{err.type}</p>
            <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-200">{err.message}</p>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{err.count} <span className="text-xs font-normal text-gray-400">occurrences</span></p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          7-Day Trend — {selected.type}
        </h3>
        <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
      </div>
    </div>
  );
}
