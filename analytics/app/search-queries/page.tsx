'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const topQueries = [
  { query: 'react hooks', count: 1243, results: 87, successRate: 82.3 },
  { query: 'typescript generics', count: 987, results: 65, successRate: 78.1 },
  { query: 'next.js api routes', count: 845, results: 92, successRate: 91.4 },
  { query: 'css grid layout', count: 723, results: 78, successRate: 85.7 },
  { query: 'python dataclass', count: 689, results: 54, successRate: 71.2 },
  { query: 'git rebase tutorial', count: 612, results: 41, successRate: 65.9 },
  { query: 'docker compose', count: 578, results: 95, successRate: 93.1 },
  { query: 'graphql schema', count: 534, results: 63, successRate: 74.8 },
  { query: 'rust ownership', count: 491, results: 38, successRate: 62.4 },
  { query: 'vue composition api', count: 467, results: 72, successRate: 80.6 },
];

const zeroResultQueries = [
  { query: 'zod custom validator v5', count: 89, lastSearched: '2026-07-22' },
  { query: 'bun test runner migration', count: 76, lastSearched: '2026-07-21' },
  { query: 'deno deploy edge functions', count: 64, lastSearched: '2026-07-22' },
  { query: 'tailwind v4 breaking changes', count: 58, lastSearched: '2026-07-20' },
  { query: 'svelte 5 runes migration', count: 52, lastSearched: '2026-07-21' },
  { query: 'astro server islands', count: 47, lastSearched: '2026-07-19' },
  { query: 'remix v2 parallel routes', count: 43, lastSearched: '2026-07-22' },
  { query: 'vitest browser mode', count: 38, lastSearched: '2026-07-20' },
];

const searchTrends = {
  labels: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  totalSearches: [
    4200, 4800, 5100, 5600, 6200, 6800, 7400, 7100, 6900, 7500, 8100, 8600,
  ],
  zeroResultSearches: [
    420, 480, 510, 490, 520, 540, 580, 560, 530, 570, 610, 640,
  ],
  uniqueQueries: [
    1800, 2100, 2300, 2500, 2800, 3100, 3400, 3200, 3100, 3500, 3800, 4100,
  ],
};

const totalSearches = searchTrends.totalSearches.reduce((a, b) => a + b, 0);
const totalZeroResults = searchTrends.zeroResultSearches.reduce(
  (a, b) => a + b,
  0
);
const successRate = (
  ((totalSearches - totalZeroResults) / totalSearches) *
  100
).toFixed(1);
const zeroResultRate = (
  (totalZeroResults / totalSearches) *
  100
).toFixed(1);
const avgQueriesPerSearch = (totalSearches / 12).toFixed(0);
const totalUniqueQueries = searchTrends.uniqueQueries[
  searchTrends.uniqueQueries.length - 1
];

const barData = {
  labels: topQueries.map((q) => q.query),
  datasets: [
    {
      label: 'Search Count',
      data: topQueries.map((q) => q.count),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderColor: 'rgb(99, 102, 241)',
      borderWidth: 1,
    },
  ],
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'Top 10 Search Queries',
      font: { size: 16 },
    },
  },
  scales: {
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 45,
      },
    },
  },
};

const lineData = {
  labels: searchTrends.labels,
  datasets: [
    {
      label: 'Total Searches',
      data: searchTrends.totalSearches,
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.3,
    },
    {
      label: 'Zero-Result Searches',
      data: searchTrends.zeroResultSearches,
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.3,
    },
    {
      label: 'Unique Queries',
      data: searchTrends.uniqueQueries,
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.3,
    },
  ],
};

const lineOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Search Trends Over Time (2026)',
      font: { size: 16 },
    },
  },
};

export default function SearchQueriesPage() {
  const [timeRange, setTimeRange] = useState('year');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Search Query Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Analyze full-text search query patterns and performance
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 3 months</option>
            <option value="year">Last 12 months</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Searches</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalSearches.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-2">+12.4% vs prior period</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Success Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{successRate}%</p>
            <p className="text-sm text-gray-500 mt-2">
              {totalSearches - totalZeroResults} queries with results
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Zero-Result Rate</p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {zeroResultRate}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {totalZeroResults.toLocaleString()} queries with no results
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Unique Queries</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalUniqueQueries.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Avg {avgQueriesPerSearch}/month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Bar data={barData} options={barOptions} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Top Queries Detail
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    #
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Query
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Count
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Results Found
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q, i) => (
                  <tr
                    key={q.query}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-500">{i + 1}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {q.query}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {q.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{q.results}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          q.successRate >= 80
                            ? 'bg-green-100 text-green-800'
                            : q.successRate >= 65
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {q.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Zero-Result Queries
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Queries returning no results &mdash; consider adding content for these
            topics
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Query
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Searches
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Last Searched
                  </th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {zeroResultQueries.map((q) => (
                  <tr
                    key={q.query}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {q.query}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{q.count}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {q.lastSearched}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          q.count >= 70
                            ? 'bg-red-100 text-red-800'
                            : q.count >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {q.count >= 70
                          ? 'High'
                          : q.count >= 50
                            ? 'Medium'
                            : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
