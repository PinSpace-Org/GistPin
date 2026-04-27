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
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const STAGES = [
  { label: 'Signup',       count: 12_400 },
  { label: 'Email Verify', count: 9_800 },
  { label: 'First Gist',   count: 6_200 },
  { label: 'Second Gist',  count: 3_900 },
  { label: 'Active User',  count: 2_100 },
];

function conversionRate(from: number, to: number) {
  return ((to / from) * 100).toFixed(1);
}

function isBottleneck(from: number, to: number) {
  return (to / from) < 0.6;
}

export default function UserFunnelChart({ onDrillDown }: { onDrillDown?: (stage: string) => void }) {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const colors = STAGES.map((s, i) => {
    if (i === 0) return 'rgba(99,102,241,0.85)';
    const bottleneck = isBottleneck(STAGES[i - 1].count, s.count);
    return bottleneck ? 'rgba(239,68,68,0.8)' : 'rgba(99,102,241,0.85)';
  });

  const data = {
    labels: STAGES.map((s) => s.label),
    datasets: [
      {
        label: 'Users',
        data: STAGES.map((s) => s.count),
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        setActiveStage(idx);
        onDrillDown?.(STAGES[idx].label);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#c7d2fe',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const idx = item.dataIndex;
            const count = STAGES[idx].count.toLocaleString();
            if (idx === 0) return `  ${count} users`;
            const rate = conversionRate(STAGES[idx - 1].count, STAGES[idx].count);
            const drop = (100 - parseFloat(rate)).toFixed(1);
            return [`  ${count} users`, `  Conversion: ${rate}%`, `  Dropoff: ${drop}%`];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          callback: (v: number | string) => Number(v).toLocaleString(),
        },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ width: '100%' }}>
      <Bar data={data} options={options} />

      {/* Conversion rate row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
        {STAGES.map((s, i) => {
          if (i === 0) return <div key={s.label} style={{ flex: 1 }} />;
          const rate = conversionRate(STAGES[i - 1].count, s.count);
          const bad = isBottleneck(STAGES[i - 1].count, s.count);
          return (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: bad ? '#ef4444' : '#6366f1',
              }}
            >
              {rate}%
            </div>
          );
        })}
      </div>

      {/* Drill-down detail */}
      {activeStage !== null && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: 13,
          }}
        >
          <strong>{STAGES[activeStage].label}</strong> —{' '}
          {STAGES[activeStage].count.toLocaleString()} users
          {activeStage > 0 && (
            <span style={{ marginLeft: 12, color: '#64748b' }}>
              Conversion from previous:{' '}
              {conversionRate(STAGES[activeStage - 1].count, STAGES[activeStage].count)}%
            </span>
          )}
          <button
            onClick={() => setActiveStage(null)}
            style={{
              marginLeft: 16,
              fontSize: 12,
              color: '#6366f1',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
