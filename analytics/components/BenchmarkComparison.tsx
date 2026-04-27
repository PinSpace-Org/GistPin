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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BenchmarkRow {
  metric: string;
  gistpin: number;
  industry: number;
  unit: string;
}

const BENCHMARKS: BenchmarkRow[] = [
  { metric: 'Daily Active Users', gistpin: 4_200, industry: 3_500, unit: '' },
  { metric: 'Engagement Rate',    gistpin: 38,    industry: 45,    unit: '%' },
  { metric: 'Retention Rate',     gistpin: 62,    industry: 55,    unit: '%' },
  { metric: 'Avg Session Length', gistpin: 4.2,   industry: 5.1,   unit: 'min' },
];

function pctDiff(gistpin: number, industry: number): number {
  return Number((((gistpin - industry) / industry) * 100).toFixed(1));
}

export default function BenchmarkComparison() {
  const labels = BENCHMARKS.map((r) => r.metric);

  // Normalise to % of industry average so both series share the same y-axis
  const gistpinNorm = BENCHMARKS.map((r) => Number(((r.gistpin / r.industry) * 100).toFixed(1)));
  const industryNorm = BENCHMARKS.map(() => 100);

  const data = {
    labels,
    datasets: [
      {
        label: 'GistPin',
        data: gistpinNorm,
        backgroundColor: gistpinNorm.map((v) => (v >= 100 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)')),
        borderRadius: 6,
        barPercentage: 0.45,
      },
      {
        label: 'Industry Avg',
        data: industryNorm,
        backgroundColor: 'rgba(148,163,184,0.5)',
        borderRadius: 6,
        barPercentage: 0.45,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 12 } } },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', font: { size: 11 }, callback: (v: number | string) => `${v}%` },
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        title: { display: true, text: '% of Industry Average', color: '#9ca3af', font: { size: 11 } },
      },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#374151', font: { size: 12 } } },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#c7d2fe',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item: import('chart.js').TooltipItem<'bar'>) => `${item.dataset.label}: ${item.raw}% of industry avg`,
        },
      },
    },
  };

  return (
    <div style={{ width: '100%' }}>
      <Bar data={data} options={options} />

      {/* Detail table */}
      <div style={{ overflowX: 'auto', marginTop: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['Metric', 'GistPin', 'Industry Avg', '% Diff'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BENCHMARKS.map((row) => {
              const diff = pctDiff(row.gistpin, row.industry);
              const above = diff >= 0;
              return (
                <tr key={row.metric} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.metric}</td>
                  <td style={{ padding: '10px 12px' }}>{row.gistpin.toLocaleString()}{row.unit && ` ${row.unit}`}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{row.industry.toLocaleString()}{row.unit && ` ${row.unit}`}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: above ? '#15803d' : '#b91c1c' }}>
                    {above ? '▲' : '▼'} {Math.abs(diff)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
        * Industry averages are mock benchmarks for illustrative purposes only and do not represent verified third-party data.
      </p>
    </div>
  );
}
