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

// ── Mock data ─────────────────────────────────────────────────────────────────

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
const OPT_IN_RATES = [38.2, 41.5, 39.8, 44.1, 47.3, 45.9, 50.2, 53.7];

const PROMPT_TIMING = [
  { timing: 'On first launch',    optIn: 28.4 },
  { timing: 'After 3 sessions',   optIn: 52.1 },
  { timing: 'After first post',   optIn: 61.8 },
  { timing: 'After 7 days',       optIn: 58.3 },
  { timing: 'On settings open',   optIn: 44.7 },
];

const AB_RESULTS = [
  { variant: 'Control (generic)',  shown: 4200, optedIn: 1428, rate: 34.0 },
  { variant: 'A – Benefit-led',    shown: 4180, optedIn: 1923, rate: 46.0 },
  { variant: 'B – Social proof',   shown: 4210, optedIn: 2189, rate: 52.0 },
];

const BEST_PRACTICES = [
  'Prompt after the user has experienced value (e.g., first successful post).',
  'Explain the benefit clearly — "Get notified when someone replies to your gist."',
  'Use social proof: "Join 50k+ users who stay updated."',
  'Avoid prompting on first launch; wait until the user is engaged.',
  'Provide an easy way to opt back in from Settings.',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function OptInRate() {
  const trendData = {
    labels: WEEKS,
    datasets: [{
      label: 'Opt-In Rate (%)',
      data: OPT_IN_RATES,
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
    }],
  };

  const timingData = {
    labels: PROMPT_TIMING.map((t) => t.timing),
    datasets: [{
      label: 'Opt-In Rate (%)',
      data: PROMPT_TIMING.map((t) => t.optIn),
      backgroundColor: 'rgba(251, 146, 60, 0.8)',
      borderColor: 'rgba(251, 146, 60, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const abData = {
    labels: AB_RESULTS.map((r) => r.variant),
    datasets: [{
      label: 'Opt-In Rate (%)',
      data: AB_RESULTS.map((r) => r.rate),
      backgroundColor: ['rgba(156, 163, 175, 0.8)', 'rgba(99, 102, 241, 0.8)', 'rgba(34, 197, 94, 0.8)'],
      borderColor: ['rgb(156, 163, 175)', 'rgb(99, 102, 241)', 'rgb(34, 197, 94)'],
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { max: 100, ticks: { callback: (v: number | string) => `${v}%` } } },
  };

  const latestRate = OPT_IN_RATES[OPT_IN_RATES.length - 1];
  const prevRate = OPT_IN_RATES[OPT_IN_RATES.length - 2];
  const delta = (latestRate - prevRate).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Opt-In Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{latestRate}%</p>
          <p className={`text-xs mt-1 ${Number(delta) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {Number(delta) >= 0 ? '+' : ''}{delta}% vs last week
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Best Prompt Timing</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">After first post</p>
          <p className="text-xs mt-1 text-green-600 dark:text-green-400">61.8% opt-in</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Best A/B Variant</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">Social proof</p>
          <p className="text-xs mt-1 text-green-600 dark:text-green-400">52.0% opt-in</p>
        </div>
      </div>

      {/* Trend + timing charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Opt-In Rate Over Time</h3>
          <div className="h-56">
            <Line data={trendData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Prompt Timing Analysis</h3>
          <div className="h-56">
            <Bar data={timingData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* A/B results */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">A/B Test Results</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48">
            <Bar data={abData} options={chartOpts} />
          </div>
          <table className="w-full text-sm self-start">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Variant</th>
                <th className="pb-2 pr-4 text-right">Shown</th>
                <th className="pb-2 pr-4 text-right">Opted In</th>
                <th className="pb-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {AB_RESULTS.map((r) => (
                <tr key={r.variant} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{r.variant}</td>
                  <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{r.shown.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{r.optedIn.toLocaleString()}</td>
                  <td className="py-2 text-right font-medium text-indigo-600 dark:text-indigo-400">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best practices */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Best Practices</h3>
        <ul className="space-y-2">
          {BEST_PRACTICES.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="text-green-500 mt-0.5">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
