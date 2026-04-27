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
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Types ─────────────────────────────────────────────────────────────────────

type AttributionModel = 'last-click' | 'first-click' | 'linear';

interface Campaign {
  name: string;
  status: 'Active' | 'Paused' | 'Completed';
  impressions: number;
  clicks: number;
  signups: number;
  spent: number;
  revenue: number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  { name: 'Spring Launch',     status: 'Active',    impressions: 142_000, clicks: 8_400, signups: 1_234, spent: 5_600, revenue: 24_680 },
  { name: 'Social Media Push', status: 'Active',    impressions: 98_500,  clicks: 5_200, signups: 892,   spent: 3_200, revenue: 17_840 },
  { name: 'Email Campaign',    status: 'Completed', impressions: 34_200,  clicks: 3_100, signups: 567,   spent: 800,   revenue: 11_340 },
];

// Attribution multipliers (mock — adjust signups/revenue weighting)
const ATTRIBUTION_MULTIPLIERS: Record<AttributionModel, number[]> = {
  'last-click':  [1.0, 1.0, 1.0],
  'first-click': [1.15, 0.9, 0.95],
  'linear':      [1.05, 0.97, 0.98],
};

function cpa(spent: number, signups: number) {
  return signups === 0 ? 0 : Number((spent / signups).toFixed(2));
}

function roas(revenue: number, spent: number) {
  return spent === 0 ? 0 : Number((revenue / spent).toFixed(2));
}

const STATUS_COLORS: Record<Campaign['status'], { bg: string; color: string }> = {
  Active:    { bg: '#dcfce7', color: '#15803d' },
  Paused:    { bg: '#fef9c3', color: '#854d0e' },
  Completed: { bg: '#f1f5f9', color: '#475569' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [attribution, setAttribution] = useState<AttributionModel>('last-click');

  const multipliers = ATTRIBUTION_MULTIPLIERS[attribution];
  const adjusted = CAMPAIGNS.map((c, i) => ({
    ...c,
    signups: Math.round(c.signups * multipliers[i]),
    revenue: Math.round(c.revenue * multipliers[i]),
  }));

  const chartData = {
    labels: adjusted.map((c) => c.name),
    datasets: [
      {
        label: 'Signups',
        data: adjusted.map((c) => c.signups),
        backgroundColor: 'rgba(99,102,241,0.8)',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'CPA ($)',
        data: adjusted.map((c) => cpa(c.spent, c.signups)),
        backgroundColor: 'rgba(251,146,60,0.8)',
        borderRadius: 6,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280' } },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#6b7280' },
        title: { display: true, text: 'Signups', color: '#9ca3af', font: { size: 11 } },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#6b7280', callback: (v: number | string) => `$${v}` },
        title: { display: true, text: 'CPA ($)', color: '#9ca3af', font: { size: 11 } },
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
      },
    },
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Campaign Performance</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Track conversions, CPA, and ROAS across all marketing campaigns.
        </p>
      </div>

      {/* Attribution model selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Attribution model:</span>
        {(['last-click', 'first-click', 'linear'] as AttributionModel[]).map((m) => (
          <button
            key={m}
            onClick={() => setAttribution(m)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: attribution === m ? '#6366f1' : '#d1d5db',
              background: attribution === m ? '#6366f1' : 'transparent',
              color: attribution === m ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Signups',   value: adjusted.reduce((s, c) => s + c.signups, 0).toLocaleString() },
          { label: 'Total Spent',     value: `$${adjusted.reduce((s, c) => s + c.spent, 0).toLocaleString()}` },
          { label: 'Total Revenue',   value: `$${adjusted.reduce((s, c) => s + c.revenue, 0).toLocaleString()}` },
          { label: 'Blended ROAS',    value: `${roas(adjusted.reduce((s, c) => s + c.revenue, 0), adjusted.reduce((s, c) => s + c.spent, 0))}x` },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Signups vs CPA by Campaign</h2>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Campaign table */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Campaign Details</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['Campaign', 'Status', 'Impressions', 'Clicks', 'Signups', 'Spent', 'CPA', 'ROAS'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjusted.map((c) => {
                const sc = STATUS_COLORS[c.status];
                return (
                  <tr key={c.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 700 }}>{c.name}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px' }}>{c.impressions.toLocaleString()}</td>
                    <td style={{ padding: '12px 12px' }}>{c.clicks.toLocaleString()}</td>
                    <td style={{ padding: '12px 12px' }}>{c.signups.toLocaleString()}</td>
                    <td style={{ padding: '12px 12px' }}>${c.spent.toLocaleString()}</td>
                    <td style={{ padding: '12px 12px' }}>${cpa(c.spent, c.signups)}</td>
                    <td style={{ padding: '12px 12px', fontWeight: 700, color: roas(c.revenue, c.spent) >= 3 ? '#15803d' : '#b45309' }}>
                      {roas(c.revenue, c.spent)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
