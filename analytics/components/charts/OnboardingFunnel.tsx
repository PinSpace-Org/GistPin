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

export interface OnboardingStep {
  label: string;
  users: number;
  avgTimeSeconds: number;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  { label: 'Sign Up',         users: 10_000, avgTimeSeconds: 45  },
  { label: 'Email Verify',    users: 8_200,  avgTimeSeconds: 120 },
  { label: 'Profile Setup',   users: 6_500,  avgTimeSeconds: 90  },
  { label: 'First Gist',      users: 4_800,  avgTimeSeconds: 75  },
  { label: 'Invite Friend',   users: 2_900,  avgTimeSeconds: 60  },
  { label: 'Completed',       users: 2_100,  avgTimeSeconds: 30  },
];

const COHORTS = ['All Users', 'Mobile', 'Desktop', 'Referral'] as const;
type Cohort = typeof COHORTS[number];

const COHORT_MULTIPLIERS: Record<Cohort, number> = {
  'All Users': 1,
  'Mobile':    0.55,
  'Desktop':   0.38,
  'Referral':  0.07,
};

function fmtTime(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export default function OnboardingFunnel({ steps = DEFAULT_STEPS }: { steps?: OnboardingStep[] }) {
  const [cohort, setCohort] = useState<Cohort>('All Users');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const mult = COHORT_MULTIPLIERS[cohort];
  const scaled = steps.map((s) => ({ ...s, users: Math.round(s.users * mult) }));

  const colors = scaled.map((s, i) => {
    if (i === 0) return 'rgba(99,102,241,0.85)';
    const rate = s.users / scaled[i - 1].users;
    return rate < 0.6 ? 'rgba(239,68,68,0.8)' : 'rgba(99,102,241,0.85)';
  });

  const data = {
    labels: scaled.map((s) => s.label),
    datasets: [{
      label: 'Users',
      data: scaled.map((s) => s.users),
      backgroundColor: colors,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) setActiveIdx(elements[0].index);
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
            const s = scaled[idx];
            const lines = [`  ${s.users.toLocaleString()} users`, `  Avg time: ${fmtTime(s.avgTimeSeconds)}`];
            if (idx > 0) {
              const rate = ((s.users / scaled[idx - 1].users) * 100).toFixed(1);
              lines.push(`  Conversion: ${rate}%`);
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } }, border: { color: '#e5e7eb' } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: number | string) => Number(v).toLocaleString() },
        border: { display: false },
      },
    },
  };

  const totalRate = scaled.length > 1
    ? ((scaled[scaled.length - 1].users / scaled[0].users) * 100).toFixed(1)
    : '100';

  return (
    <div style={{ width: '100%' }}>
      {/* Cohort selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {COHORTS.map((c) => (
          <button
            key={c}
            onClick={() => setCohort(c)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: cohort === c ? '#6366f1' : '#e2e8f0',
              background: cohort === c ? '#6366f1' : '#fff',
              color: cohort === c ? '#fff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', alignSelf: 'center' }}>
          Overall completion: <strong style={{ color: parseFloat(totalRate) < 30 ? '#ef4444' : '#6366f1' }}>{totalRate}%</strong>
        </span>
      </div>

      <Bar data={data} options={options} />

      {/* Conversion rate row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10 }}>
        {scaled.map((s, i) => {
          if (i === 0) return <div key={s.label} style={{ flex: 1 }} />;
          const rate = ((s.users / scaled[i - 1].users) * 100).toFixed(1);
          const bad = s.users / scaled[i - 1].users < 0.6;
          return (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: bad ? '#ef4444' : '#6366f1' }}>
              {rate}%
            </div>
          );
        })}
      </div>

      {/* Drop-off highlights */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        {scaled.map((s, i) => {
          if (i === 0) return null;
          const rate = s.users / scaled[i - 1].users;
          if (rate >= 0.6) return null;
          return (
            <div key={s.label} style={{ padding: '6px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626' }}>
              ⚠ Drop-off at <strong>{s.label}</strong>: {((1 - rate) * 100).toFixed(1)}% lost
            </div>
          );
        })}
      </div>

      {/* Step detail */}
      {activeIdx !== null && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}>
          <strong>{scaled[activeIdx].label}</strong> — {scaled[activeIdx].users.toLocaleString()} users &nbsp;|&nbsp; Avg time: {fmtTime(scaled[activeIdx].avgTimeSeconds)}
          {activeIdx > 0 && (
            <span style={{ marginLeft: 12, color: '#64748b' }}>
              Conversion: {((scaled[activeIdx].users / scaled[activeIdx - 1].users) * 100).toFixed(1)}%
            </span>
          )}
          <button onClick={() => setActiveIdx(null)} style={{ marginLeft: 16, fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
