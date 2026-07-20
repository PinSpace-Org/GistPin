'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

/** Demo GrantFox campaign metrics (replace with live API when wired). */
export const GRANTFOX_WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
export const APPLICATION_RATE = [12, 18, 22, 31, 28, 35, 41, 38];
export const COMPLETION_RATE = [4, 7, 9, 14, 16, 19, 22, 24];
export const QUALITY_SCORE = [62, 65, 68, 71, 73, 74, 76, 78];

export const LEADERBOARD = [
  { rank: 1, handle: '@cornerblue', merged: 12, quality: 88, xlm: 240 },
  { rank: 2, handle: '@stellar-dev', merged: 9, quality: 84, xlm: 180 },
  { rank: 3, handle: '@grant-fox', merged: 8, quality: 81, xlm: 160 },
  { rank: 4, handle: '@open-source', merged: 6, quality: 79, xlm: 120 },
  { rank: 5, handle: '@soroban-lab', merged: 5, quality: 77, xlm: 100 },
];

export function applicationRatePct(apps: number[], completions: number[]): string {
  const a = apps.reduce((s, n) => s + n, 0);
  const c = completions.reduce((s, n) => s + n, 0);
  if (a === 0) return '0%';
  return `${((c / a) * 100).toFixed(1)}%`;
}

export function campaignRoi(spendXlm: number, valueXlm: number): string {
  if (spendXlm <= 0) return 'n/a';
  return `${(((valueXlm - spendXlm) / spendXlm) * 100).toFixed(1)}%`;
}

const SPEND_XLM = 800;
const VALUE_XLM = 1240;

export default function CampaignDashboard() {
  const appsTotal = APPLICATION_RATE.reduce((a, b) => a + b, 0);
  const doneTotal = COMPLETION_RATE.reduce((a, b) => a + b, 0);
  const completionPct = applicationRatePct(APPLICATION_RATE, COMPLETION_RATE);
  const roi = campaignRoi(SPEND_XLM, VALUE_XLM);
  const avgQuality = (QUALITY_SCORE.reduce((a, b) => a + b, 0) / QUALITY_SCORE.length).toFixed(1);

  const funnelData = {
    labels: GRANTFOX_WEEKS,
    datasets: [
      {
        label: 'Applications',
        data: APPLICATION_RATE,
        backgroundColor: 'rgba(99,102,241,0.75)',
      },
      {
        label: 'Completions',
        data: COMPLETION_RATE,
        backgroundColor: 'rgba(16,185,129,0.75)',
      },
    ],
  };

  const qualityData = {
    labels: GRANTFOX_WEEKS,
    datasets: [
      {
        label: 'PR quality score',
        data: QUALITY_SCORE,
        borderColor: 'rgba(245,158,11,1)',
        backgroundColor: 'rgba(245,158,11,0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const stats = [
    { label: 'Applications (8w)', value: appsTotal },
    { label: 'Issue completion rate', value: completionPct },
    { label: 'Avg PR quality', value: avgQuality },
    { label: 'Campaign ROI', value: roi },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
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
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            Application vs completion rate
          </h2>
          <Bar
            data={funnelData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            PR quality score trend
          </h2>
          <Line
            data={qualityData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: { y: { min: 50, max: 100 } },
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          Contributor leaderboard
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Contributor</th>
                <th className="py-2 pr-4">Merged PRs</th>
                <th className="py-2 pr-4">Quality</th>
                <th className="py-2">Est. XLM</th>
              </tr>
            </thead>
            <tbody>
              {LEADERBOARD.map((row) => (
                <tr
                  key={row.handle}
                  className="border-b border-gray-100 text-gray-800 dark:border-gray-800 dark:text-gray-100"
                >
                  <td className="py-2 pr-4 font-mono">#{row.rank}</td>
                  <td className="py-2 pr-4 font-medium">{row.handle}</td>
                  <td className="py-2 pr-4">{row.merged}</td>
                  <td className="py-2 pr-4">{row.quality}</td>
                  <td className="py-2">{row.xlm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Demo series: spend {SPEND_XLM} XLM / estimated delivered value {VALUE_XLM} XLM (ROI {roi}).
          Wire to GrantFox campaign API when available.
        </p>
      </div>
    </div>
  );
}
