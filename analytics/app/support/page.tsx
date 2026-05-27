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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

// ── Mock data ─────────────────────────────────────────────────────────────────

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const TICKET_VOLUME = [142, 158, 134, 171, 189, 163, 177, 195];
const RESOLVED     = [128, 149, 130, 155, 172, 158, 165, 181];

const CATEGORIES = ['Bug Report', 'Feature Request', 'Billing', 'Account Access', 'General'];
const CATEGORY_COUNTS = [312, 198, 145, 221, 87];
const CATEGORY_COLORS = [
  'rgba(239, 68, 68, 0.8)',
  'rgba(99, 102, 241, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(107, 114, 128, 0.8)',
];

const RESOLUTION_BUCKETS = ['<1h', '1–4h', '4–8h', '8–24h', '1–3d', '>3d'];
const RESOLUTION_DIST    = [89, 214, 178, 312, 143, 27];

const AGENTS = [
  { name: 'Alice M.',  resolved: 312, avgHours: 3.2, csat: 4.8 },
  { name: 'Bob K.',    resolved: 287, avgHours: 4.1, csat: 4.6 },
  { name: 'Carol T.',  resolved: 341, avgHours: 2.9, csat: 4.9 },
  { name: 'David R.',  resolved: 198, avgHours: 5.8, csat: 4.2 },
  { name: 'Eva S.',    resolved: 265, avgHours: 3.7, csat: 4.7 },
];

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

export default function SupportPage() {
  const totalOpen     = TICKET_VOLUME.reduce((a, b) => a + b, 0);
  const totalResolved = RESOLVED.reduce((a, b) => a + b, 0);
  const resolutionRate = ((totalResolved / totalOpen) * 100).toFixed(1);
  const avgResolutionH = (AGENTS.reduce((s, a) => s + a.avgHours, 0) / AGENTS.length).toFixed(1);

  const volumeData = {
    labels: WEEKS,
    datasets: [
      {
        label: 'Opened',
        data: TICKET_VOLUME,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
      {
        label: 'Resolved',
        data: RESOLVED,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  const categoryData = {
    labels: CATEGORIES,
    datasets: [{
      data: CATEGORY_COUNTS,
      backgroundColor: CATEGORY_COLORS,
      borderWidth: 1,
    }],
  };

  const resolutionData = {
    labels: RESOLUTION_BUCKETS,
    datasets: [{
      label: 'Tickets',
      data: RESOLUTION_DIST,
      backgroundColor: RESOLUTION_DIST.map((_, i) =>
        i <= 1 ? 'rgba(16, 185, 129, 0.75)' : i <= 3 ? 'rgba(245, 158, 11, 0.75)' : 'rgba(239, 68, 68, 0.75)'
      ),
      borderRadius: 4,
    }],
  };

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Ticket Analytics</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets',    value: totalOpen.toLocaleString(),  sub: 'last 8 weeks' },
          { label: 'Resolution Rate',  value: resolutionRate + '%',        sub: `${totalResolved.toLocaleString()} resolved` },
          { label: 'Avg Resolution',   value: avgResolutionH + 'h',        sub: 'across all agents' },
          { label: 'Avg CSAT',         value: (AGENTS.reduce((s, a) => s + a.csat, 0) / AGENTS.length).toFixed(1) + ' / 5', sub: 'customer satisfaction' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Volume over time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Ticket Volume Over Time</h2>
        <div className="h-64">
          <Bar data={volumeData} options={chartOpts} />
        </div>
      </div>

      {/* Category + resolution distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Category Breakdown</h2>
          <div className="h-56">
            <Doughnut data={categoryData} options={chartOpts} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Resolution Time Distribution</h2>
          <div className="h-56">
            <Bar data={resolutionData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Agent performance table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Agent Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Agent</th>
                <th className="pb-2 pr-4 text-right">Resolved</th>
                <th className="pb-2 pr-4 text-right">Avg Resolution</th>
                <th className="pb-2 text-right">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.sort((a, b) => b.resolved - a.resolved).map((agent) => (
                <tr key={agent.name} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{agent.name}</td>
                  <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-300">{agent.resolved}</td>
                  <td className="py-2 pr-4 text-right text-amber-600 dark:text-amber-400">{agent.avgHours}h</td>
                  <td className="py-2 text-right">
                    <span className={`font-semibold ${agent.csat >= 4.7 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {agent.csat}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
