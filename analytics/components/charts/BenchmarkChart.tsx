'use client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { memo } from 'react';
import ChartWrapper from './ChartWrapper';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface BenchmarkEntry {
  category: string;
  gistpin: number;
  industry: number;
}

const DEFAULT_DATA: BenchmarkEntry[] = [
  { category: 'Engagement Rate', gistpin: 68, industry: 45 },
  { category: 'Daily Active Users', gistpin: 52, industry: 61 },
  { category: 'Retention (7d)', gistpin: 74, industry: 58 },
  { category: 'Avg. Session (min)', gistpin: 4.2, industry: 3.1 },
  { category: 'Posts / User', gistpin: 3.8, industry: 2.9 },
  { category: 'Response Rate', gistpin: 41, industry: 55 },
];

interface BenchmarkChartProps {
  entries?: BenchmarkEntry[];
}

function pctDiff(a: number, b: number): string {
  if (b === 0) return '—';
  const diff = ((a - b) / b) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
}

function BenchmarkChart({ entries = DEFAULT_DATA }: BenchmarkChartProps) {
  const labels = entries.map((e) => e.category);

  const data = {
    labels,
    datasets: [
      {
        label: 'GistPin',
        data: entries.map((e) => e.gistpin),
        backgroundColor: entries.map((e) =>
          e.gistpin >= e.industry ? 'rgba(99,102,241,0.85)' : 'rgba(99,102,241,0.45)'
        ),
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Industry Avg.',
        data: entries.map((e) => e.industry),
        backgroundColor: 'rgba(156,163,175,0.6)',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#6b7280', font: { size: 12 }, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#c7d2fe',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          afterBody: (items: TooltipItem<'bar'>[]) => {
            const gp = items.find((i) => i.dataset.label === 'GistPin')?.raw as number | undefined;
            const ind = items.find((i) => i.dataset.label === 'Industry Avg.')?.raw as number | undefined;
            if (gp !== undefined && ind !== undefined) {
              return [`Δ vs Industry: ${pctDiff(gp, ind)}`];
            }
            return [];
          },
        },
      },
    },
  };

  return (
    <ChartWrapper title="GistPin vs Industry Benchmarks">
      <Bar data={data} options={options} />
      {/* Percentage difference table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs text-gray-500">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-1 pr-4">Metric</th>
              <th className="text-right pb-1 pr-4">GistPin</th>
              <th className="text-right pb-1 pr-4">Industry</th>
              <th className="text-right pb-1">Δ</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const diff = pctDiff(e.gistpin, e.industry);
              const positive = e.gistpin >= e.industry;
              return (
                <tr key={e.category} className="border-b last:border-0">
                  <td className="py-1 pr-4">{e.category}</td>
                  <td className="text-right pr-4 font-medium text-gray-700 dark:text-gray-300">
                    {e.gistpin}
                  </td>
                  <td className="text-right pr-4">{e.industry}</td>
                  <td
                    className={`text-right font-semibold ${
                      positive ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartWrapper>
  );
}

export default memo(BenchmarkChart);
