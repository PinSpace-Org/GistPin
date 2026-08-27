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
import { Line, Bar } from 'react-chartjs-2';
import {
  TOXICITY_TREND,
  LOCATION_TOXICITY,
  TIME_OF_DAY_TOXICITY,
  HIGH_TOXICITY_EVENTS,
  getOverallToxicityScore,
  getToxicityChange,
  getModerationEffectiveness,
} from '@/lib/toxicity-tracker';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const trendData = {
  labels: TOXICITY_TREND.map(d => d.date),
  datasets: [
    {
      label: 'Avg Toxicity Score',
      data: TOXICITY_TREND.map(d => d.score),
      borderColor: 'rgba(239,68,68,1)',
      backgroundColor: 'rgba(239,68,68,0.1)',
      fill: true,
      tension: 0.4,
      yAxisID: 'y',
    },
    {
      label: 'Flagged Gists',
      data: TOXICITY_TREND.map(d => d.flagged),
      borderColor: 'rgba(234,179,8,1)',
      backgroundColor: 'rgba(234,179,8,0.1)',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
    },
    {
      label: 'Moderated Gists',
      data: TOXICITY_TREND.map(d => d.moderated),
      borderColor: 'rgba(34,197,94,1)',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
    },
  ],
};

const locationBarData = {
  labels: LOCATION_TOXICITY.map(l => l.city),
  datasets: [
    {
      label: 'Avg Toxicity Score',
      data: LOCATION_TOXICITY.map(l => l.avgScore),
      backgroundColor: LOCATION_TOXICITY.map(l => l.avgScore >= 0.20 ? 'rgba(239,68,68,0.7)' : l.avgScore >= 0.15 ? 'rgba(234,179,8,0.7)' : 'rgba(34,197,94,0.7)'),
      borderRadius: 4,
    },
  ],
};

const moderationImpactData = {
  labels: TOXICITY_TREND.map(d => d.date),
  datasets: [
    {
      label: 'Flagged',
      data: TOXICITY_TREND.map(d => d.flagged),
      backgroundColor: 'rgba(234,179,8,0.6)',
      borderRadius: 4,
    },
    {
      label: 'Moderated',
      data: TOXICITY_TREND.map(d => d.moderated),
      backgroundColor: 'rgba(34,197,94,0.6)',
      borderRadius: 4,
    },
  ],
};

const timeOfDayData = {
  labels: TIME_OF_DAY_TOXICITY.map(d => `${d.hour}:00`),
  datasets: [
    {
      label: 'Avg Toxicity Score',
      data: TIME_OF_DAY_TOXICITY.map(d => d.avgScore),
      borderColor: 'rgba(168,85,247,1)',
      backgroundColor: 'rgba(168,85,247,0.1)',
      fill: true,
      tension: 0.4,
      yAxisID: 'y',
    },
    {
      label: 'Flagged Count',
      data: TIME_OF_DAY_TOXICITY.map(d => d.flaggedCount),
      borderColor: 'rgba(239,68,68,0.6)',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.4,
      yAxisID: 'y1',
    },
  ],
};

export default function ToxicityTrendsPage() {
  const overallScore = getOverallToxicityScore();
  const toxicityChange = getToxicityChange();
  const modEffectiveness = getModerationEffectiveness();

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#fee2e2 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Moderation</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Content Toxicity Trends</h1>
        <p style={{ margin: 0, color: '#475569' }}>Track toxicity scores, moderation intervention impact, and detect high-toxicity events across regions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Current Toxicity Score', value: overallScore.toFixed(2), color: overallScore >= 0.20 ? '#ef4444' : '#22c55e' },
          { label: 'Month-over-Month', value: `${toxicityChange >= 0 ? '+' : ''}${toxicityChange}%`, color: toxicityChange >= 0 ? '#ef4444' : '#22c55e' },
          { label: 'Moderation Rate', value: `${modEffectiveness}%`, color: '#6366f1' },
          { label: 'Active Events', value: HIGH_TOXICITY_EVENTS.filter(e => e.status === 'Monitoring').length.toString(), color: '#eab308' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Toxicity Score Trend</h2>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { position: 'left', title: { display: true, text: 'Score' }, min: 0, max: 0.4 }, y1: { position: 'right', title: { display: true, text: 'Count' }, grid: { drawOnChartArea: false } } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Toxicity by Location</h2>
          <Bar data={locationBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 0.35 } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Moderation Intervention Impact</h2>
          <Bar data={moderationImpactData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Toxicity by Time of Day</h2>
          <Line data={timeOfDayData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { position: 'left', title: { display: true, text: 'Score' }, min: 0, max: 0.4 }, y1: { position: 'right', title: { display: true, text: 'Count' }, grid: { drawOnChartArea: false } } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>High-Toxicity Event Detection</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Event', 'Date', 'Location', 'Score', 'Type', 'Status', 'Gists Affected'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HIGH_TOXICITY_EVENTS.map((evt, i) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{evt.id}</td>
                  <td style={{ padding: '10px 12px' }}>{evt.date}</td>
                  <td style={{ padding: '10px 12px' }}>{evt.location}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: evt.score >= 0.7 ? '#fef2f2' : '#fef3c7', color: evt.score >= 0.7 ? '#dc2626' : '#d97706', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{evt.score}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{evt.type}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: evt.status === 'Resolved' ? '#dcfce7' : '#fef3c7', color: evt.status === 'Resolved' ? '#16a34a' : '#d97706', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>{evt.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{evt.gistsAffected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
