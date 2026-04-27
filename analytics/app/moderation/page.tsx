'use client';

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const PENDING_REVIEW = 43;
const AVG_RESPONSE_HOURS = 2.3;
const AUTO_MOD_ACCURACY = 87;

const FLAG_REASONS = [
  { label: 'Spam',          pct: 45, color: 'rgba(239,68,68,0.8)',   border: 'rgba(239,68,68,1)'   },
  { label: 'Inappropriate', pct: 30, color: 'rgba(251,191,36,0.8)',  border: 'rgba(251,191,36,1)'  },
  { label: 'Harassment',    pct: 15, color: 'rgba(249,115,22,0.8)',  border: 'rgba(249,115,22,1)'  },
  { label: 'Other',         pct: 10, color: 'rgba(99,102,241,0.8)',  border: 'rgba(99,102,241,1)'  },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAILY_FLAGS = [18, 24, 21, 31, 27, 14, 9];

const MOD_ACTIONS = {
  labels: ['Approved', 'Removed', 'Warned'],
  data: [62, 28, 10],
  colors: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)', 'rgba(251,191,36,0.8)'],
};

const QUEUE = [
  { id: 'G-1042', reason: 'Spam',          location: 'New York',  age: '12 min' },
  { id: 'G-1039', reason: 'Inappropriate', location: 'London',    age: '34 min' },
  { id: 'G-1037', reason: 'Harassment',    location: 'Tokyo',     age: '1 hr'   },
  { id: 'G-1031', reason: 'Spam',          location: 'Sydney',    age: '2 hr'   },
  { id: 'G-1028', reason: 'Other',         location: 'São Paulo', age: '3 hr'   },
];

export default function ModerationPage() {
  const pieData = {
    labels: FLAG_REASONS.map((r) => `${r.label} (${r.pct}%)`),
    datasets: [{
      data: FLAG_REASONS.map((r) => r.pct),
      backgroundColor: FLAG_REASONS.map((r) => r.color),
      borderColor: FLAG_REASONS.map((r) => r.border),
      borderWidth: 2,
    }],
  };

  const lineData = {
    labels: DAYS,
    datasets: [{
      label: 'Flags',
      data: DAILY_FLAGS,
      borderColor: 'rgba(239,68,68,1)',
      backgroundColor: 'rgba(239,68,68,0.1)',
      tension: 0.3,
      fill: true,
    }],
  };

  const barData = {
    labels: MOD_ACTIONS.labels,
    datasets: [{
      label: 'Actions',
      data: MOD_ACTIONS.data,
      backgroundColor: MOD_ACTIONS.colors,
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Content Moderation Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',       value: PENDING_REVIEW,              suffix: ' gists',   warn: PENDING_REVIEW > 30 },
          { label: 'Avg Response Time',    value: AVG_RESPONSE_HOURS,          suffix: ' hrs',     warn: false },
          { label: 'Auto-Mod Accuracy',    value: `${AUTO_MOD_ACCURACY}%`,     suffix: '',         warn: false },
          { label: 'Flags This Week',      value: DAILY_FLAGS.reduce((a, b) => a + b, 0), suffix: '', warn: false },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900 ${kpi.warn ? 'border-red-400' : ''}`}>
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.warn ? 'text-red-500' : ''}`}>
              {kpi.value}{kpi.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Flag Reason Breakdown</h2>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <Pie data={pieData} options={{ responsive: true }} />
          </div>
        </div>
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Daily Flags (Last 7 Days)</h2>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Moderator Actions</h2>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>

      {/* Queue */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">
          Pending Review Queue
          <span className="ml-2 text-sm font-normal text-red-500">({PENDING_REVIEW} total)</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              {['Gist ID', 'Flag Reason', 'Location', 'Age', 'Action'].map((h) => (
                <th key={h} className="pb-2 pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {QUEUE.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 pr-6 font-mono text-indigo-600 dark:text-indigo-400">{item.id}</td>
                <td className="py-2 pr-6">{item.reason}</td>
                <td className="py-2 pr-6">{item.location}</td>
                <td className="py-2 pr-6 text-gray-500">{item.age}</td>
                <td className="py-2 pr-6">
                  <div className="flex gap-2">
                    <button className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:opacity-80">Approve</button>
                    <button className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:opacity-80">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
