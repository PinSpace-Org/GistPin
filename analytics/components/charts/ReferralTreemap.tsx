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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const sources = [
  { source: 'Organic Search', medium: 'google', campaign: 'seo', users: 4200 },
  { source: 'Direct', medium: 'none', campaign: 'none', users: 2800 },
  { source: 'Social', medium: 'twitter', campaign: 'launch-q2', users: 1950 },
  { source: 'Email', medium: 'newsletter', campaign: 'weekly-digest', users: 1400 },
  { source: 'Referral', medium: 'partner-sites', campaign: 'collab', users: 980 },
  { source: 'Paid Search', medium: 'google-ads', campaign: 'brand-cpc', users: 760 },
  { source: 'Social', medium: 'instagram', campaign: 'reels-promo', users: 540 },
  { source: 'Other', medium: 'misc', campaign: 'none', users: 370 },
];

const total = sources.reduce((s, r) => s + r.users, 0);

const colors = [
  'rgba(99,102,241,0.8)',
  'rgba(59,130,246,0.8)',
  'rgba(34,197,94,0.8)',
  'rgba(234,179,8,0.8)',
  'rgba(239,68,68,0.8)',
  'rgba(168,85,247,0.8)',
  'rgba(20,184,166,0.8)',
  'rgba(156,163,175,0.8)',
];

const data = {
  labels: sources.map(s => s.source + (s.medium !== 'none' ? ` / ${s.medium}` : '')),
  datasets: [{
    label: 'Users',
    data: sources.map(s => s.users),
    backgroundColor: colors,
    borderRadius: 4,
  }],
};

const options = {
  indexAxis: 'y' as const,
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17,24,39,0.9)',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (item: TooltipItem<'bar'>) => {
          const idx = item.dataIndex;
          const pct = ((sources[idx].users / total) * 100).toFixed(1);
          return `  ${item.formattedValue} users (${pct}%) — campaign: ${sources[idx].campaign}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: { color: '#9ca3af' },
      border: { display: false },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#374151', font: { size: 12 } },
    },
  },
};

export default function ReferralTreemap() {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>User Acquisition by Source / Medium / Campaign</h2>
        <span style={{ fontSize: 13, color: '#64748b' }}>Total: {total.toLocaleString()} users</span>
      </div>
      <Bar data={data} options={options} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 16 }}>
        {sources.map((s, i) => (
          <span key={s.source + s.medium} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
            {((s.users / total) * 100).toFixed(1)}% {s.source}
          </span>
        ))}
      </div>
    </div>
  );
}
