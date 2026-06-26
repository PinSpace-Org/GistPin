'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { getFreshnessScores, getAgeBuckets, getMonthlyTrend, getStaleGists } from '@/lib/freshness-calc';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function FreshnessPage() {
  const freshness = getFreshnessScores();
  const ageBuckets = getAgeBuckets();
  const trend = getMonthlyTrend();
  const stale = getStaleGists();

  const scoreBar = {
    labels: freshness.map((f) => f.label),
    datasets: [{
      label: 'Score',
      data: freshness.map((f) => f.score),
      backgroundColor: freshness.map((f) => f.score >= 70 ? 'rgba(34,197,94,0.7)' : f.score >= 40 ? 'rgba(251,191,36,0.7)' : 'rgba(239,68,68,0.7)'),
      borderRadius: 3,
    }],
  };

  const agePie = {
    labels: ageBuckets.map((a) => `${a.label} (${a.pct}%)`),
    datasets: [{
      data: ageBuckets.map((a) => a.count),
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(59,130,246,0.8)', 'rgba(251,191,36,0.8)', 'rgba(239,68,68,0.8)', 'rgba(107,114,128,0.8)'],
      borderWidth: 0,
    }],
  };

  const trendData = {
    labels: trend.map((t) => t.month),
    datasets: [
      {
        label: 'Fresh Gists',
        data: trend.map((t) => t.fresh),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 3,
      },
      {
        label: 'Stale Gists',
        data: trend.map((t) => t.stale),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 3,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Content Freshness Index</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Measure how current and up-to-date the gist content library is.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Overall Freshness',   value: '82/100' },
          { label: 'Content < 7 Days',    value: '62%' },
          { label: 'Stale Rate (90d+)',   value: '5%' },
          { label: 'Avg Last Updated',    value: '12 days' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Freshness Scores</h3>
          <Bar data={scoreBar} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } }, indexAxis: 'y' }} height={120} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Content Age Distribution</h3>
          <Pie data={agePie} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Fresh vs Stale Trend</h3>
        <Bar data={trendData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Stale Gists Requiring Attention</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Gist</th>
              <th style={{ padding: '6px 10px' }}>Title</th>
              <th style={{ padding: '6px 10px' }}>Last Updated</th>
              <th style={{ padding: '6px 10px' }}>Days Since Update</th>
            </tr>
          </thead>
          <tbody>
            {stale.map((s) => (
              <tr key={s.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{s.gistId}</td>
                <td style={{ padding: '6px 10px' }}>{s.title}</td>
                <td style={{ padding: '6px 10px' }}>{s.lastUpdated}</td>
                <td style={{ padding: '6px 10px', fontWeight: 600, color: s.daysSinceUpdate > 180 ? '#ef4444' : s.daysSinceUpdate > 90 ? '#eab308' : '#6b7280' }}>
                  {s.daysSinceUpdate}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
