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
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

const SERVICES = [
  { name: 'Compute',  monthly: [420, 435, 418, 460, 472, 490], color: 'rgba(99,102,241,0.75)' },
  { name: 'Storage',  monthly: [210, 215, 220, 225, 228, 234], color: 'rgba(34,197,94,0.75)'  },
  { name: 'Bandwidth',monthly: [95,  102, 98,  110, 107, 115], color: 'rgba(251,191,36,0.75)' },
  { name: 'Database', monthly: [180, 180, 185, 190, 192, 195], color: 'rgba(239,68,68,0.75)'  },
];

const barData = {
  labels: MONTHS,
  datasets: SERVICES.map((s) => ({
    label: s.name,
    data: s.monthly,
    backgroundColor: s.color,
  })),
};

const totalByMonth = MONTHS.map((_, i) =>
  SERVICES.reduce((sum, s) => sum + s.monthly[i], 0),
);

const lineData = {
  labels: MONTHS,
  datasets: [
    {
      label: 'Total Cost ($)',
      data: totalByMonth,
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
};

const latestTotal = totalByMonth[totalByMonth.length - 1];
const prevTotal   = totalByMonth[totalByMonth.length - 2];
const momChange   = (((latestTotal - prevTotal) / prevTotal) * 100).toFixed(1);

const STATS = [
  { label: 'Current Month', value: `$${latestTotal}` },
  { label: 'MoM Change',    value: `${Number(momChange) >= 0 ? '+' : ''}${momChange}%` },
  { label: 'Top Service',   value: 'Compute' },
  { label: 'YTD Spend',     value: `$${totalByMonth.reduce((a, b) => a + b, 0)}` },
];

export default function InfrastructureCostDashboard() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Infrastructure Cost Analysis
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
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">Cost by Service</h2>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">Total Monthly Spend</h2>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }} />
        </div>
      </div>
    </main>
  );
}
