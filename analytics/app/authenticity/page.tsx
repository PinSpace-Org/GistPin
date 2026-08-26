'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  MOCK_GISTS,
  scoreAll,
  getAuthenticityDistribution,
  getAuthenticityTrend,
  getAuthenticityColor,
  exportSuspiciousCSV,
  SUSPICIOUS_THRESHOLD,
} from '@/lib/authenticity-score';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const scored = scoreAll(MOCK_GISTS);
const flagged = scored.filter((s) => s.isSuspicious);
const distribution = getAuthenticityDistribution(scored);
const trend = getAuthenticityTrend(MOCK_GISTS);

const distData = {
  labels: distribution.map((d) => d.range),
  datasets: [
    {
      label: 'Number of gists',
      data: distribution.map((d) => d.count),
      backgroundColor: distribution.map((d) =>
        d.range === '<50' ? 'rgba(239,68,68,0.8)' : 'rgba(99,102,241,0.8)',
      ),
      borderRadius: 4,
    },
  ],
};

const distOpts = {
  responsive: true,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', precision: 0 }, border: { display: false } },
  },
  plugins: { legend: { display: false } },
};

const trendData = {
  labels: trend.map((t) => t.week),
  datasets: [
    {
      label: 'Avg authenticity score',
      data: trend.map((t) => t.avgScore),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.15)',
      tension: 0.35,
      fill: true,
      pointRadius: 4,
    },
  ],
};

const trendOpts = {
  responsive: true,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12 } } },
};

export default function AuthenticityPage() {
  const avg = Math.round(scored.reduce((s, c) => s + c.score, 0) / (scored.length || 1));
  const improving = trend.length >= 2 && trend[trend.length - 1].avgScore > trend[0].avgScore;

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Content Authenticity</h1>
          <p style={{ margin: 0, color: '#475569' }}>
            Scores each gist for authenticity vs spam indicators. Content under{' '}
            <strong>{SUSPICIOUS_THRESHOLD}</strong> is flagged for moderation review.
          </p>
        </div>
        <button
          onClick={exportSuspiciousCSV.bind(null, scored)}
          style={{ padding: '10px 20px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          Export flagged ({flagged.length})
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Gists Scored', value: scored.length.toString() },
          { label: 'Avg Authenticity', value: `${avg}` },
          { label: 'Flagged (< threshold)', value: flagged.length.toString() },
          { label: 'Trend (6w)', value: improving ? 'Improving ↑' : 'Declining ↓' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Distribution + trend charts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Score distribution</h2>
          <Bar data={distData} options={distOpts} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Score improvement over time</h2>
          <Line data={trendData} options={trendOpts} />
        </div>
      </div>

      {/* Flagged content table */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Flagged content ({flagged.length})</h2>
        {flagged.length === 0 ? (
          <p style={{ color: '#64748b' }}>No suspicious content detected.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Title', 'Author', 'Score', 'Reports', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flagged.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{g.title}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>@{g.author}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: `${getAuthenticityColor(g.score)}22`,
                        color: getAuthenticityColor(g.score),
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontWeight: 700,
                      }}>
                        {g.score}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {MOCK_GISTS.find((m) => m.id === g.id)?.flags ?? 0}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                        Flagged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
