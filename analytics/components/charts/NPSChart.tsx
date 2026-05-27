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
import { calcNPS, npsOverTime, npsBySegment, type NPSResponse } from '@/lib/nps';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RESPONSES: NPSResponse[] = [
  ...Array.from({ length: 80 },  (_, i) => ({ score: 9 + (i % 2),  segment: 'Enterprise', date: `2026-0${(i % 5) + 1}-${String((i % 28) + 1).padStart(2, '0')}` })),
  ...Array.from({ length: 120 }, (_, i) => ({ score: 7 + (i % 3),  segment: 'Pro',        date: `2026-0${(i % 5) + 1}-${String((i % 28) + 1).padStart(2, '0')}` })),
  ...Array.from({ length: 100 }, (_, i) => ({ score: 4 + (i % 7),  segment: 'Free',       date: `2026-0${(i % 5) + 1}-${String((i % 28) + 1).padStart(2, '0')}` })),
];

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

export default function NPSChart() {
  const overall   = calcNPS(MOCK_RESPONSES);
  const trend     = npsOverTime(MOCK_RESPONSES);
  const segments  = npsBySegment(MOCK_RESPONSES);

  const breakdownData = {
    labels: ['Promoters', 'Passives', 'Detractors'],
    datasets: [{
      data: [overall.promoters, overall.passives, overall.detractors],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderWidth: 1,
    }],
  };

  const trendData = {
    labels: trend.map((t) => t.period),
    datasets: [{
      label: 'NPS Score',
      data: trend.map((t) => t.nps),
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  };

  const segmentData = {
    labels: segments.map((s) => s.segment),
    datasets: [{
      label: 'NPS Score',
      data: segments.map((s) => s.nps),
      backgroundColor: segments.map((s) =>
        s.nps >= 50 ? 'rgba(16, 185, 129, 0.75)' : s.nps >= 0 ? 'rgba(245, 158, 11, 0.75)' : 'rgba(239, 68, 68, 0.75)'
      ),
      borderRadius: 4,
    }],
  };

  const npsColor = overall.nps >= 50 ? 'text-emerald-600 dark:text-emerald-400'
    : overall.nps >= 0 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* NPS score + breakdown cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">NPS Score</p>
          <p className={`text-4xl font-bold mt-1 ${npsColor}`}>{overall.nps}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{overall.total} responses</p>
        </div>
        {[
          { label: 'Promoters',  count: overall.promoters,  pct: overall.total, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Passives',   count: overall.passives,   pct: overall.total, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Detractors', count: overall.detractors, pct: overall.total, color: 'text-red-600 dark:text-red-400' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.count}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {((item.count / item.pct) * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {/* Trend + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">NPS Trend Over Time</h2>
          <div className="h-52">
            <Line data={trendData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Promoter / Passive / Detractor</h2>
          <div className="h-52">
            <Doughnut data={breakdownData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Segment comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">NPS by Segment</h2>
        <div className="h-48">
          <Bar data={segmentData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
        </div>
      </div>
    </div>
  );
}
