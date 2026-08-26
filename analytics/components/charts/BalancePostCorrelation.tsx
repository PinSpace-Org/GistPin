'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';

import {
  getBalanceTiers,
  getBalanceTrends,
  getLowBalanceBehavior,
  computeCorrelation,
  getTierSummary,
} from '@/lib/balance-analysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const card = { background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' };

const baseOpts = {
  responsive: true,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'top' as const, labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
    tooltip: { backgroundColor: 'rgba(17,24,39,0.9)', titleColor: '#f9fafb', bodyColor: '#d1d5db', padding: 12, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 8, font: { size: 11 } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } }, border: { display: false } },
  },
};

const scatterData = {
  datasets: [
    {
      label: 'Users',
      data: Array.from({ length: 120 }, () => {
        const balance = Math.round(Math.pow(10, Math.random() * 3) * 10) / 10;
        const posts = Math.max(0, Math.round(0.5 + Math.log2(balance + 1) * 1.2 + (Math.random() - 0.5) * 3));
        return { x: balance, y: posts };
      }),
      backgroundColor: 'rgba(99,102,241,0.5)',
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
};

export default function BalancePostCorrelation() {
  const tiers = getBalanceTiers();
  const trends = getBalanceTrends();
  const lowBehavior = getLowBalanceBehavior();
  const correlation = computeCorrelation();
  const summary = getTierSummary();

  const tierLabels = tiers.map((t) => t.label);
  const tierColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const postFrequencyData = {
    labels: tierLabels,
    datasets: [{
      label: 'Avg Posts / Week',
      data: tiers.map((t) => t.avgPostFrequency),
      backgroundColor: tierColors.map((c) => `${c}cc`),
      borderRadius: 6,
    }],
  };

  const reactionData = {
    labels: tierLabels,
    datasets: [{
      label: 'Avg Reactions Received',
      data: tiers.map((t) => t.avgReactions),
      backgroundColor: tierColors.map((c) => `${c}99`),
      borderRadius: 6,
    }],
  };

  const churnData = {
    labels: tierLabels,
    datasets: [{
      label: 'Churn Rate (%)',
      data: tiers.map((t) => t.churnRate),
      backgroundColor: tierColors.map((c) => `${c}88`),
      borderRadius: 6,
    }],
  };

  const trendData = {
    labels: [...new Set(trends.map((t) => t.month))],
    datasets: ['Dust', 'Standard', 'Whale'].map((tier, i) => ({
      label: tier,
      data: trends.filter((t) => t.tier === tier).map((t) => t.postsPerUser),
      borderColor: ['#ef4444', '#3b82f6', '#ec4899'][i],
      backgroundColor: ['rgba(239,68,68,0.08)', 'rgba(59,130,246,0.08)', 'rgba(236,72,153,0.08)'][i],
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const lowBehaviorData = {
    labels: lowBehavior.map((b) => b.metric),
    datasets: [
      { label: 'Low Balance (<10 XLM)', data: lowBehavior.map((b) => b.lowBalance), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
      { label: 'Mid Balance (10-200 XLM)', data: lowBehavior.map((b) => b.midBalance), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
      { label: 'High Balance (200+ XLM)', data: lowBehavior.map((b) => b.highBalance), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
    ],
  };

  const balanceTrendLabels = [...new Set(trends.map((t) => t.month))];
  const balanceTrendData = {
    labels: balanceTrendLabels,
    datasets: ['Dust', 'Light', 'Power', 'Whale'].map((tier, i) => ({
      label: tier,
      data: trends.filter((t) => t.tier === tier).map((t) => t.avgBalance),
      borderColor: ['#ef4444', '#22c55e', '#8b5cf6', '#ec4899'][i],
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const totalUsers = tiers.reduce((s, t) => s + t.userCount, 0);

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Correlation (r)', value: correlation.toFixed(3), color: '#6366f1' },
          { label: 'Total Users', value: totalUsers.toLocaleString(), color: '#16a34a' },
          { label: 'Avg Posts / Tier', value: summary.avgPostsAcrossTiers.toString(), color: '#f59e0b' },
          { label: 'Most Active Tier', value: summary.strongestTier, color: '#8b5cf6' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Scatter: balance vs posts */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Balance vs Post Frequency Scatter</h2>
        <Scatter data={scatterData} options={{ ...baseOpts, scales: { x: { ...baseOpts.scales.x, title: { display: true, text: 'Balance (XLM)', color: '#64748b' }, type: 'logarithmic' }, y: { ...baseOpts.scales.y, title: { display: true, text: 'Posts / Week', color: '#64748b' } } } }} />
      </div>

      {/* Bar charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Post Frequency by Balance Tier</h2>
          <Bar data={postFrequencyData} options={baseOpts as Parameters<typeof Bar>[0]['options']} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Reaction Rate by Balance Tier</h2>
          <Bar data={reactionData} options={baseOpts as Parameters<typeof Bar>[0]['options']} />
        </div>
      </div>

      {/* Low balance behavior comparison */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Low-Balance User Behavior</h2>
        <Bar data={lowBehaviorData} options={{ ...baseOpts, plugins: { ...baseOpts.plugins, legend: { ...baseOpts.plugins.legend, position: 'bottom' } } } as Parameters<typeof Bar>[0]['options']} />
      </div>

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Post Frequency Trend by Tier</h2>
          <Line data={trendData} options={baseOpts as Parameters<typeof Line>[0]['options']} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Average Balance Trend by Tier</h2>
          <Line data={balanceTrendData} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v} XLM` } } } } as Parameters<typeof Line>[0]['options']} />
        </div>
      </div>
    </div>
  );
}
