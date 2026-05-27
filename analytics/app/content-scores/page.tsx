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
import { calcEngagementScores, MOCK_CONTENT } from '@/lib/engagement-score';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const scored = calcEngagementScores(MOCK_CONTENT);
const top5 = scored.slice(0, 5);

const FACTOR_COLORS: Record<string, string> = {
  views:          'rgba(99,102,241,0.8)',
  likes:          'rgba(236,72,153,0.8)',
  comments:       'rgba(34,197,94,0.8)',
  shares:         'rgba(234,179,8,0.8)',
  bookmarks:      'rgba(59,130,246,0.8)',
  avgReadSeconds: 'rgba(168,85,247,0.8)',
};

const stackedData = {
  labels: top5.map((c) => c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title),
  datasets: Object.keys(FACTOR_COLORS).map((factor) => ({
    label: factor,
    data: top5.map((c) => c.breakdown[factor as keyof typeof c.breakdown]),
    backgroundColor: FACTOR_COLORS[factor],
    borderRadius: 2,
  })),
};

const stackedOpts = {
  responsive: true,
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12 } } },
};

function exportCSV() {
  const header = 'Title,Score,Views,Likes,Comments,Shares,Bookmarks,AvgReadSec';
  const rows = scored.map((c) =>
    `"${c.title}",${c.score},${c.views},${c.likes},${c.comments},${c.shares},${c.bookmarks},${c.avgReadSeconds}`
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'content-scores.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function ContentScoresPage() {
  const avg = (scored.reduce((s, c) => s + c.score, 0) / scored.length).toFixed(1);
  const top = scored[0];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Content Engagement Scores</h1>
          <p style={{ margin: 0, color: '#475569' }}>Weighted scoring across views, likes, comments, shares, bookmarks, and read time.</p>
        </div>
        <button
          onClick={exportCSV}
          style={{ padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Content Items', value: scored.length.toString() },
          { label: 'Avg Engagement Score', value: avg },
          { label: 'Top Scorer', value: top.title.length > 18 ? top.title.slice(0, 18) + '…' : top.title },
          { label: 'Top Score', value: top.score.toString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)', marginBottom: 28 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Engagement Factor Breakdown — Top 5</h2>
        <Bar data={stackedData} options={stackedOpts} />
      </div>

      {/* Leaderboard table */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Full Leaderboard</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['#', 'Title', 'Score', 'Views', 'Likes', 'Comments', 'Shares', 'Bookmarks', 'Avg Read'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scored.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.title}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#ede9fe', color: '#6366f1', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{c.score}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{c.views.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{c.likes.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{c.comments.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{c.shares.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{c.bookmarks.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{c.avgReadSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
