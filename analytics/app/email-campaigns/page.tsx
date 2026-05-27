'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  name: string;
  sent: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  date: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  { name: 'Welcome Series',       sent: 12400, opens: 7068, clicks: 2604, unsubscribes: 62,  date: '2026-05-01' },
  { name: 'Feature Announcement', sent: 18200, opens: 9282, clicks: 3276, unsubscribes: 91,  date: '2026-05-05' },
  { name: 'Weekly Digest #18',    sent: 21500, opens: 9675, clicks: 2795, unsubscribes: 108, date: '2026-05-12' },
  { name: 'Re-engagement',        sent: 8900,  opens: 2670, clicks: 712,  unsubscribes: 267, date: '2026-05-15' },
  { name: 'Product Update v2.4',  sent: 19800, opens: 11286,clicks: 4158, unsubscribes: 79,  date: '2026-05-20' },
  { name: 'Weekly Digest #19',    sent: 22100, opens: 10387,clicks: 3094, unsubscribes: 133, date: '2026-05-26' },
];

const BEST_SEND_TIMES = [
  { day: 'Mon', hour: '10am', rate: 28.4 },
  { day: 'Tue', hour: '9am',  rate: 31.2 },
  { day: 'Wed', hour: '11am', rate: 34.7 },
  { day: 'Thu', hour: '10am', rate: 33.1 },
  { day: 'Fri', hour: '9am',  rate: 29.8 },
  { day: 'Sat', hour: '12pm', rate: 22.1 },
  { day: 'Sun', hour: '2pm',  rate: 19.6 },
];

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const pct = (a: number, b: number) => ((a / b) * 100).toFixed(1) + '%';

export default function EmailCampaignsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const visible = selected ? CAMPAIGNS.filter((c) => c.name === selected) : CAMPAIGNS;

  const totalSent   = CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const totalOpens  = CAMPAIGNS.reduce((s, c) => s + c.opens, 0);
  const totalClicks = CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);
  const totalUnsubs = CAMPAIGNS.reduce((s, c) => s + c.unsubscribes, 0);

  const openRateData = {
    labels: CAMPAIGNS.map((c) => c.name),
    datasets: [
      {
        label: 'Open Rate %',
        data: CAMPAIGNS.map((c) => +((c.opens / c.sent) * 100).toFixed(1)),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
      {
        label: 'Click Rate %',
        data: CAMPAIGNS.map((c) => +((c.clicks / c.sent) * 100).toFixed(1)),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  const unsubData = {
    labels: CAMPAIGNS.map((c) => c.name),
    datasets: [{
      label: 'Unsubscribes',
      data: CAMPAIGNS.map((c) => c.unsubscribes),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  };

  const bestTimeData = {
    labels: BEST_SEND_TIMES.map((t) => `${t.day} ${t.hour}`),
    datasets: [{
      label: 'Avg Open Rate %',
      data: BEST_SEND_TIMES.map((t) => t.rate),
      backgroundColor: BEST_SEND_TIMES.map((t) =>
        t.rate === Math.max(...BEST_SEND_TIMES.map((x) => x.rate))
          ? 'rgba(245, 158, 11, 0.9)'
          : 'rgba(99, 102, 241, 0.6)'
      ),
      borderRadius: 4,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Campaign Performance</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent',    value: fmt(totalSent),   sub: `${CAMPAIGNS.length} campaigns` },
          { label: 'Avg Open Rate', value: pct(totalOpens, totalSent),  sub: `${fmt(totalOpens)} opens` },
          { label: 'Avg Click Rate',value: pct(totalClicks, totalSent), sub: `${fmt(totalClicks)} clicks` },
          { label: 'Unsubscribes',  value: fmt(totalUnsubs), sub: pct(totalUnsubs, totalSent) + ' rate' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Open & click rates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Open Rate vs Click Rate by Campaign</h2>
        <div className="h-64">
          <Bar data={openRateData} options={chartOpts} />
        </div>
      </div>

      {/* Unsubscribe trend + best send time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Unsubscribe Trend</h2>
          <div className="h-56">
            <Line data={unsubData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Best Send Time (Avg Open Rate %)</h2>
          <div className="h-56">
            <Bar data={bestTimeData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Campaign List</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Campaign</th>
                <th className="pb-2 pr-4 text-right">Sent</th>
                <th className="pb-2 pr-4 text-right">Open Rate</th>
                <th className="pb-2 pr-4 text-right">Click Rate</th>
                <th className="pb-2 pr-4 text-right">Unsubs</th>
                <th className="pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr
                  key={c.name}
                  onClick={() => setSelected(selected === c.name ? null : c.name)}
                  className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-300">{fmt(c.sent)}</td>
                  <td className="py-2 pr-4 text-right text-indigo-600 dark:text-indigo-400 font-medium">{pct(c.opens, c.sent)}</td>
                  <td className="py-2 pr-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{pct(c.clicks, c.sent)}</td>
                  <td className="py-2 pr-4 text-right text-red-500 dark:text-red-400">{c.unsubscribes}</td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
