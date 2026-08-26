'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import {
  calculateRegionDiversity,
  getDiversityTrend,
  getLanguageBreakdown,
  getLowDiversityAlerts,
} from '@/lib/diversity-calc';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function DiversityIndexPage() {
  const regions = calculateRegionDiversity();
  const trend = getDiversityTrend();
  const langBreakdown = getLanguageBreakdown();
  const alerts = getLowDiversityAlerts(regions);

  const avgScore = (regions.reduce((s, r) => s + r.diversityScore, 0) / regions.length).toFixed(1);
  const totalGists = regions.reduce((s, r) => s + r.gistCount, 0);

  const regionBarData = {
    labels: regions.map((r) => `${r.country}`),
    datasets: [{
      label: 'Diversity Score',
      data: regions.map((r) => r.diversityScore),
      backgroundColor: regions.map((r) =>
        r.diversityScore >= 70 ? 'rgba(34,197,94,0.75)' :
        r.diversityScore >= 50 ? 'rgba(234,179,8,0.75)' :
        'rgba(239,68,68,0.75)'
      ),
      borderRadius: 4,
    }],
  };

  const trendData = {
    labels: trend.map((t) => t.month),
    datasets: [
      {
        label: 'Overall Diversity',
        data: trend.map((t) => t.overallScore),
        borderColor: 'rgba(99,102,241,1)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Language Diversity',
        data: trend.map((t) => t.languageDiversity),
        borderColor: 'rgba(59,130,246,1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Topic Diversity',
        data: trend.map((t) => t.topicDiversity),
        borderColor: 'rgba(16,185,129,1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const radarData = {
    labels: regions.map((r) => r.country),
    datasets: [
      {
        label: 'Language Diversity',
        data: regions.map((r) => Math.min(100, r.diversityScore * (0.9 + Math.random() * 0.2))),
        borderColor: 'rgba(99,102,241,1)',
        backgroundColor: 'rgba(99,102,241,0.15)',
        pointRadius: 3,
      },
      {
        label: 'Topic Diversity',
        data: regions.map((r) => Math.min(100, r.diversityScore * (0.85 + Math.random() * 0.3))),
        borderColor: 'rgba(16,185,129,1)',
        backgroundColor: 'rgba(16,185,129,0.15)',
        pointRadius: 3,
      },
    ],
  };

  const langPieData = {
    labels: langBreakdown.map((l) => l.language),
    datasets: [{
      data: langBreakdown.map((l) => l.globalShare),
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(234,179,8,0.8)', 'rgba(239,68,68,0.8)', 'rgba(168,85,247,0.8)'],
      borderWidth: 0,
    }],
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Geographic Content Diversity Index</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Language and topic diversity across regions with low-diversity detection and trend analysis.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Global Diversity Score', value: avgScore, sub: 'out of 100' },
          { label: 'Languages Tracked', value: '10', sub: 'across all regions' },
          { label: 'Topics Tracked', value: '10', sub: 'content categories' },
          { label: 'Low-Diversity Alerts', value: alerts.length.toString(), sub: 'regions below 45' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 700 }}>{value}</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Diversity Score by Country</h3>
          <Bar data={regionBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } }, x: { grid: { display: false }, ticks: { color: '#9ca3af' } } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Diversity Trend Over Time</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 12 } } }, scales: { y: { min: 50, max: 80, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } }, x: { grid: { display: false }, ticks: { color: '#9ca3af' } } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Language vs Topic Radar</h3>
          <Radar data={radarData} options={{ responsive: true, scales: { r: { beginAtZero: true, max: 100, ticks: { color: '#9ca3af', backdropColor: 'transparent' }, grid: { color: 'rgba(0,0,0,0.05)' }, pointLabels: { color: '#374151', font: { size: 11 } } } }, plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 12 } } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Global Language Share</h3>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <Doughnut data={langPieData} options={{ responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 12 } } } }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Region Diversity Details</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Country</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Region</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Score</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Languages</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Topics</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Gists</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Top Language</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.country} style={{ borderBottom: '1px solid #f3f4f6', background: r.isLowDiversity ? '#fef2f2' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.country}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{r.region}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: getScoreColor(r.diversityScore) + '22', color: getScoreColor(r.diversityScore), padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {r.diversityScore}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{r.languageCount}</td>
                  <td style={{ padding: '8px 12px' }}>{r.topicCount}</td>
                  <td style={{ padding: '8px 12px' }}>{r.gistCount.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px' }}>{r.topLanguages[0]?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Low-Diversity Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.country} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.country} — {a.region}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{a.alertMessage}</div>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: '#fecaca', color: '#dc2626' }}>Score: {a.diversityScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
