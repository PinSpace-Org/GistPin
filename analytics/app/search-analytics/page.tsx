'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Mock data ─────────────────────────────────────────────────────────────────

interface SearchQuery {
  query: string;
  count: number;
  clickRate: number;
  refinements: number;
}

interface NoResultQuery {
  query: string;
  count: number;
}

const TOP_SEARCHES: SearchQuery[] = [
  { query: 'nearby gists',      count: 4821, clickRate: 72.4, refinements: 0.8 },
  { query: 'stellar tips',      count: 3204, clickRate: 68.1, refinements: 1.2 },
  { query: 'local events',      count: 2987, clickRate: 65.3, refinements: 1.5 },
  { query: 'anonymous post',    count: 2341, clickRate: 81.2, refinements: 0.4 },
  { query: 'map pins',          count: 1987, clickRate: 59.8, refinements: 2.1 },
  { query: 'trending locations',count: 1654, clickRate: 74.6, refinements: 0.9 },
  { query: 'gist history',      count: 1432, clickRate: 55.2, refinements: 2.8 },
  { query: 'user profile',      count: 1201, clickRate: 88.4, refinements: 0.3 },
];

const NO_RESULTS: NoResultQuery[] = [
  { query: 'soroban wallet',    count: 342 },
  { query: 'ipfs upload',       count: 287 },
  { query: 'geo fence settings',count: 231 },
  { query: 'stellar address',   count: 198 },
  { query: 'dark mode toggle',  count: 154 },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CLICK_RATES_OVER_TIME = [64.2, 67.8, 65.1, 71.3, 69.4, 73.2, 72.1];
const REFINEMENT_RATES = [1.8, 1.6, 2.1, 1.4, 1.7, 1.3, 1.5];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchAnalyticsPage() {
  const [tab, setTab] = useState<'top' | 'noResults'>('top');

  const clickRateData = {
    labels: DAYS,
    datasets: [{
      label: 'Search-to-Click Rate (%)',
      data: CLICK_RATES_OVER_TIME,
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const refinementData = {
    labels: DAYS,
    datasets: [{
      label: 'Avg Query Refinements',
      data: REFINEMENT_RATES,
      backgroundColor: 'rgba(251, 146, 60, 0.8)',
      borderColor: 'rgba(251, 146, 60, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const totalSearches = TOP_SEARCHES.reduce((s, q) => s + q.count, 0);
  const avgClickRate = (TOP_SEARCHES.reduce((s, q) => s + q.clickRate, 0) / TOP_SEARCHES.length).toFixed(1);
  const noResultsTotal = NO_RESULTS.reduce((s, q) => s + q.count, 0);

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search Analytics</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Searches', value: totalSearches.toLocaleString() },
          { label: 'Avg Click Rate', value: `${avgClickRate}%` },
          { label: 'No-Result Queries', value: noResultsTotal.toLocaleString() },
          { label: 'Unique Queries', value: (TOP_SEARCHES.length + NO_RESULTS.length).toString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Search-to-Click Rate (7 days)</h2>
          <div className="h-56">
            <Bar data={clickRateData} options={chartOpts} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Query Refinement Tracking (7 days)</h2>
          <div className="h-56">
            <Bar data={refinementData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Tabs: top searches / no results */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(['top', 'noResults'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'top' ? 'Top Searches' : 'No-Result Queries'}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-x-auto">
          {tab === 'top' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Query</th>
                  <th className="pb-2 pr-4 text-right">Searches</th>
                  <th className="pb-2 pr-4 text-right">Click Rate</th>
                  <th className="pb-2 text-right">Avg Refinements</th>
                </tr>
              </thead>
              <tbody>
                {TOP_SEARCHES.map((q, i) => (
                  <tr key={q.query} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{q.query}</td>
                    <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{q.count.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">
                      <span className={`font-medium ${q.clickRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {q.clickRate}%
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{q.refinements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Query</th>
                  <th className="pb-2 text-right">Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {NO_RESULTS.map((q, i) => (
                  <tr key={q.query} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-red-600 dark:text-red-400">{q.query}</td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{q.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
