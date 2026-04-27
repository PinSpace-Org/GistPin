'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const thisWeek = [142, 158, 175, 161, 189, 110, 95];
const lastWeek = [130, 144, 160, 155, 172, 102, 88];

function pctDiff(a: number, b: number) {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

export default function WeeklyComparisonChart() {
  const [hideLast, setHideLast] = useState(false);

  const totalThis = thisWeek.reduce((s, v) => s + v, 0);
  const totalLast = lastWeek.reduce((s, v) => s + v, 0);
  const diff = pctDiff(totalThis, totalLast);

  const data = useMemo(() => ({
    labels: days,
    datasets: [
      {
        label: 'This Week',
        data: thisWeek,
        borderColor: 'rgba(99,102,241,1)',
        borderWidth: 2.5,
        borderDash: [],
        pointRadius: 4,
        pointBackgroundColor: 'rgba(99,102,241,1)',
        tension: 0.35,
        fill: false,
      },
      {
        label: 'Last Week',
        data: lastWeek,
        borderColor: 'rgba(156,163,175,0.9)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: 'rgba(156,163,175,0.9)',
        tension: 0.35,
        fill: false,
        hidden: hideLast,
      },
    ],
  }), [hideLast]);

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 12 } },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 12 } },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'line'>) => {
            const cur = item.raw as number;
            const prev = lastWeek[item.dataIndex];
            const pct = pctDiff(cur, prev);
            const sign = pct >= 0 ? '+' : '';
            return `  ${item.dataset.label}: ${cur.toLocaleString()} gists  (${sign}${pct.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  const diffColor = diff >= 0 ? '#16a34a' : '#dc2626';
  const diffSign  = diff >= 0 ? '+' : '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Header row: legend + weekly % diff */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {/* Manual legend with toggle */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="rgba(99,102,241,1)" strokeWidth="2.5" /></svg>
            This Week
          </span>
          <button
            onClick={() => setHideLast(h => !h)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, background: 'none',
              border: 'none', cursor: 'pointer', fontSize: 12, padding: 0,
              opacity: hideLast ? 0.4 : 1,
            }}
          >
            <svg width="20" height="10">
              <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(156,163,175,0.9)" strokeWidth="2" strokeDasharray="6 4" />
            </svg>
            Last Week
          </button>
        </div>

        {/* Weekly % difference badge */}
        <span style={{
          fontSize: 13, fontWeight: 700, color: diffColor,
          background: diff >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
          padding: '3px 10px', borderRadius: 20,
        }}>
          {diffSign}{diff.toFixed(1)}% vs last week
        </span>
      </div>

      <Line data={data} options={options} />
    </div>
  );
}
