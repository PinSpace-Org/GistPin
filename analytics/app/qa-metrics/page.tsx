'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const SUITES = ['Unit', 'Integration', 'E2E', 'Snapshot'];
const PASS_COUNTS  = [312, 87, 44, 128];
const FAIL_COUNTS  = [8,   5,  3,  2];
const SKIP_COUNTS  = [12,  3,  1,  6];

const barData = {
  labels: SUITES,
  datasets: [
    { label: 'Passed', data: PASS_COUNTS, backgroundColor: 'rgba(34,197,94,0.75)' },
    { label: 'Failed', data: FAIL_COUNTS, backgroundColor: 'rgba(239,68,68,0.75)' },
    { label: 'Skipped', data: SKIP_COUNTS, backgroundColor: 'rgba(156,163,175,0.75)' },
  ],
};

const totalPass = PASS_COUNTS.reduce((a, b) => a + b, 0);
const totalFail = FAIL_COUNTS.reduce((a, b) => a + b, 0);
const totalSkip = SKIP_COUNTS.reduce((a, b) => a + b, 0);

const donutData = {
  labels: ['Passed', 'Failed', 'Skipped'],
  datasets: [
    {
      data: [totalPass, totalFail, totalSkip],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)', 'rgba(156,163,175,0.8)'],
      borderWidth: 1,
    },
  ],
};

const STATS = [
  { label: 'Total Tests', value: totalPass + totalFail + totalSkip },
  { label: 'Pass Rate', value: `${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%` },
  { label: 'Failed', value: totalFail },
  { label: 'Coverage', value: '84%' },
];

export default function QAMetricsDashboard() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        QA Metrics Dashboard
      </h1>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">Results by Suite</h2>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: false }, y: { beginAtZero: true } } }} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">Overall Breakdown</h2>
          <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
    </main>
  );
}
