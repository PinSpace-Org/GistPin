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

type Status = 'Planned' | 'In Progress' | 'Completed' | 'Under Review';
type Segment = 'Enterprise' | 'Pro' | 'Free';

interface Feature {
  id: number;
  title: string;
  votes: number;
  status: Status;
  trend: number[];   // last 6 weeks
  segments: Record<Segment, number>;
  priority: number;  // 0–100
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const FEATURES: Feature[] = [
  {
    id: 1, title: 'Offline mode',
    votes: 1842, status: 'Planned',
    trend: [980, 1120, 1340, 1510, 1680, 1842],
    segments: { Enterprise: 620, Pro: 810, Free: 412 },
    priority: 88,
  },
  {
    id: 2, title: 'Custom map layers',
    votes: 1534, status: 'In Progress',
    trend: [800, 950, 1100, 1250, 1400, 1534],
    segments: { Enterprise: 780, Pro: 540, Free: 214 },
    priority: 82,
  },
  {
    id: 3, title: 'Team workspaces',
    votes: 1287, status: 'Under Review',
    trend: [600, 720, 890, 1010, 1150, 1287],
    segments: { Enterprise: 910, Pro: 290, Free: 87 },
    priority: 79,
  },
  {
    id: 4, title: 'Export to CSV/PDF',
    votes: 987,  status: 'Completed',
    trend: [400, 520, 680, 790, 900, 987],
    segments: { Enterprise: 310, Pro: 480, Free: 197 },
    priority: 65,
  },
  {
    id: 5, title: 'Dark mode',
    votes: 876,  status: 'Completed',
    trend: [300, 420, 580, 700, 810, 876],
    segments: { Enterprise: 180, Pro: 390, Free: 306 },
    priority: 60,
  },
  {
    id: 6, title: 'Webhook integrations',
    votes: 743,  status: 'Planned',
    trend: [200, 310, 430, 560, 660, 743],
    segments: { Enterprise: 520, Pro: 180, Free: 43 },
    priority: 72,
  },
];

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
const SEGMENTS: Segment[] = ['Enterprise', 'Pro', 'Free'];
const SEGMENT_COLORS: Record<Segment, string> = {
  Enterprise: 'rgba(99, 102, 241, 0.8)',
  Pro:        'rgba(16, 185, 129, 0.8)',
  Free:       'rgba(107, 114, 128, 0.8)',
};

const STATUS_COLORS: Record<Status, string> = {
  'Planned':      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'In Progress':  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Completed':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Under Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

export default function RoadmapPage() {
  const [activeFeature, setActiveFeature] = useState<Feature>(FEATURES[0]);

  const totalVotes = FEATURES.reduce((s, f) => s + f.votes, 0);

  const votesBarData = {
    labels: FEATURES.map((f) => f.title),
    datasets: [{
      label: 'Votes',
      data: FEATURES.map((f) => f.votes),
      backgroundColor: FEATURES.map((f) =>
        f.id === activeFeature.id ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.4)'
      ),
      borderColor: 'rgb(99, 102, 241)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const trendData = {
    labels: WEEKS,
    datasets: [{
      label: activeFeature.title,
      data: activeFeature.trend,
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  };

  const segmentData = {
    labels: SEGMENTS,
    datasets: [{
      data: SEGMENTS.map((s) => activeFeature.segments[s]),
      backgroundColor: SEGMENTS.map((s) => SEGMENT_COLORS[s]),
      borderWidth: 1,
    }],
  };

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Roadmap Voting</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Votes',      value: totalVotes.toLocaleString(), sub: 'across all features' },
          { label: 'Feature Requests', value: String(FEATURES.length),     sub: 'tracked items' },
          { label: 'In Progress',      value: String(FEATURES.filter((f) => f.status === 'In Progress').length), sub: 'being built' },
          { label: 'Top Priority',     value: FEATURES.sort((a, b) => b.priority - a.priority)[0].title, sub: `score ${FEATURES[0].priority}/100` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate">{kpi.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Vote counts bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Vote Counts</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Click a feature row below to drill in</p>
        <div className="h-56">
          <Bar data={votesBarData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {/* Trend + segment breakdown for selected feature */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Vote Trend — <span className="text-indigo-600 dark:text-indigo-400">{activeFeature.title}</span>
          </h2>
          <div className="h-52">
            <Line data={trendData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">User Segment Breakdown</h2>
          <div className="h-52">
            <Doughnut data={segmentData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Feature request list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Feature Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Feature</th>
                <th className="pb-2 pr-4 text-right">Votes</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 text-right">Priority Score</th>
              </tr>
            </thead>
            <tbody>
              {[...FEATURES].sort((a, b) => b.votes - a.votes).map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setActiveFeature(f)}
                  className={`border-b border-gray-50 dark:border-gray-700/50 last:border-0 cursor-pointer transition-colors ${
                    f.id === activeFeature.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{f.title}</td>
                  <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300 font-semibold">{f.votes.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${f.priority}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{f.priority}</span>
                    </div>
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
