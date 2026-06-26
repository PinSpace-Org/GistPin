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
import type { TooltipItem } from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';
import { memo, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

// Mock data
const PERCENTILES = { p25: 85, p50: 142, p75: 230, p95: 480 };

const DISTRIBUTION = [
  { range: '0–50', count: 320 },
  { range: '51–100', count: 580 },
  { range: '101–150', count: 740 },
  { range: '151–200', count: 610 },
  { range: '201–300', count: 490 },
  { range: '301–500', count: 310 },
  { range: '501–1000', count: 180 },
  { range: '1000+', count: 70 },
];

const TREND = [
  { month: 'Jan', avgLength: 120 },
  { month: 'Feb', avgLength: 128 },
  { month: 'Mar', avgLength: 135 },
  { month: 'Apr', avgLength: 130 },
  { month: 'May', avgLength: 142 },
  { month: 'Jun', avgLength: 150 },
];

const SCATTER_DATA = [
  { length: 50, engagement: 12 }, { length: 100, engagement: 28 }, { length: 150, engagement: 45 },
  { length: 200, engagement: 52 }, { length: 250, engagement: 48 }, { length: 300, engagement: 55 },
  { length: 400, engagement: 42 }, { length: 500, engagement: 38 }, { length: 700, engagement: 30 },
  { length: 900, engagement: 22 }, { length: 80, engagement: 20 }, { length: 120, engagement: 36 },
  { length: 180, engagement: 49 }, { length: 320, engagement: 51 }, { length: 600, engagement: 35 },
];

const LANGUAGES = [
  { lang: 'English', p50: 145 }, { lang: 'Spanish', p50: 162 }, { lang: 'French', p50: 158 },
  { lang: 'German', p50: 170 }, { lang: 'Japanese', p50: 95 }, { lang: 'Other', p50: 140 },
];

type Tab = 'distribution' | 'trend' | 'correlation' | 'languages';

function PercentileMarker({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono w-8 text-right text-gray-500">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-2 relative">
        <div
          className="absolute top-0 h-2 bg-blue-500 rounded"
          style={{ width: `${Math.min((value / 500) * 100, 100)}%` }}
        />
      </div>
      <span className="font-semibold w-14 text-right">{value} ch</span>
    </div>
  );
}

function DistributionChart() {
  const data = {
    labels: DISTRIBUTION.map((b) => b.range),
    datasets: [
      {
        label: 'Gists',
        data: DISTRIBUTION.map((b) => b.count),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (i: TooltipItem<'bar'>) => `  ${(i.raw as number).toLocaleString()} gists`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Character count' }, grid: { display: false } },
      y: { title: { display: true, text: 'Gists' }, beginAtZero: true },
    },
  };
  return <Bar data={data} options={options} />;
}

function TrendChart() {
  const data = {
    labels: TREND.map((t) => t.month),
    datasets: [
      {
        label: 'Avg length (chars)',
        data: TREND.map((t) => t.avgLength),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderColor: 'rgba(16,185,129,1)',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { title: { display: true, text: 'Avg chars' }, beginAtZero: false },
    },
  };
  return <Bar data={data} options={options} />;
}

function CorrelationChart() {
  const chartData = {
    datasets: [
      {
        label: 'Gists',
        data: SCATTER_DATA.map((d) => ({ x: d.length, y: d.engagement })),
        backgroundColor: 'rgba(99,102,241,0.65)',
        pointRadius: 5,
      },
    ],
  };
  return (
    <Scatter
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Length: ${ctx.parsed.x}  Engagement: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'Content length (chars)' } },
          y: { title: { display: true, text: 'Engagement score' }, beginAtZero: true },
        },
      }}
    />
  );
}

function LanguageChart() {
  const data = {
    labels: LANGUAGES.map((l) => l.lang),
    datasets: [
      {
        label: 'Median length (chars)',
        data: LANGUAGES.map((l) => l.p50),
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderColor: 'rgba(245,158,11,1)',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { title: { display: true, text: 'Median chars' }, beginAtZero: true },
    },
  };
  return <Bar data={data} options={options} />;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'distribution', label: 'Distribution' },
  { id: 'trend', label: 'Over Time' },
  { id: 'correlation', label: 'vs Engagement' },
  { id: 'languages', label: 'By Language' },
];

function LengthAnalysis() {
  const [tab, setTab] = useState<Tab>('distribution');

  return (
    <div className="space-y-4">
      {/* Percentile markers */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Percentile Markers
        </p>
        <PercentileMarker label="P25" value={PERCENTILES.p25} />
        <PercentileMarker label="P50" value={PERCENTILES.p50} />
        <PercentileMarker label="P75" value={PERCENTILES.p75} />
        <PercentileMarker label="P95" value={PERCENTILES.p95} />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', width: '100%' }}>
        {tab === 'distribution' && <DistributionChart />}
        {tab === 'trend' && <TrendChart />}
        {tab === 'correlation' && <CorrelationChart />}
        {tab === 'languages' && <LanguageChart />}
      </div>
    </div>
  );
}

export default memo(LengthAnalysis);
