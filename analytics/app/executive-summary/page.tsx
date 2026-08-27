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
import { Line } from 'react-chartjs-2';
import {
  KEY_METRICS,
  WEEK_COMPARISON,
  TOP_RISKS,
  getOverallHealthScore,
  getHealthColor,
  getLightColor,
  getLightBg,
  getSeverityColor,
} from '@/lib/summary-generator';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const healthScore = getOverallHealthScore();
const healthColor = getHealthColor(healthScore);

const healthTrendData = {
  labels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'This Week'],
  datasets: [{
    label: 'Platform Health Score',
    data: [82, 85, 83, 88, 86, 84, 82, healthScore],
    borderColor: healthColor,
    backgroundColor: `${healthColor}20`,
    fill: true,
    tension: 0.4,
    pointRadius: 4,
    pointBackgroundColor: healthColor,
  }],
};

function exportPDF() {
  window.print();
}

export default function ExecutiveSummaryPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Executive Summary</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Platform Health Dashboard</h1>
            <p style={{ margin: 0, color: '#475569' }}>Key metrics snapshot, week-over-week comparison, and top risks for leadership review.</p>
          </div>
        </div>
        <button
          onClick={exportPDF}
          style={{ padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, marginTop: 14 }}
        >
          Export PDF
        </button>
      </div>

      {/* Overall Health Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Health</p>
          <div style={{ width: 120, height: 120, borderRadius: '50%', border: `6px solid ${healthColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: healthColor }}>{healthScore}</span>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#6b7280' }}>
            {healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : 'Critical'}
          </p>
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Health Score Trend</h2>
          <Line data={healthTrendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 60, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} />
        </div>
      </div>

      {/* Traffic Light Indicators */}
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 16 }}>Key Metrics — Traffic Light Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {KEY_METRICS.map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: getLightBg(m.light), border: `1px solid ${getLightColor(m.light)}30` }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: getLightColor(m.light), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{m.name}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{m.current}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: m.change >= 0 && (m.name === 'API Latency (p95)' || m.name === 'Toxicity Score' || m.name === 'Error Rate') ? '#ef4444' : m.change >= 0 ? '#22c55e' : '#ef4444' }}>
                {m.change >= 0 ? '+' : ''}{m.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Week-over-Week Comparison */}
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 16 }}>Week-over-Week Comparison</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Metric', 'This Week', 'Last Week', 'Change', 'Trend'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_COMPARISON.map((w, i) => (
                <tr key={w.metric} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{w.metric}</td>
                  <td style={{ padding: '10px 14px' }}>{typeof w.thisWeek === 'number' && w.thisWeek > 1000 ? w.thisWeek.toLocaleString() : w.thisWeek}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{typeof w.lastWeek === 'number' && w.lastWeek > 1000 ? w.lastWeek.toLocaleString() : w.lastWeek}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: w.change > 0 ? '#dcfce7' : w.change < 0 ? '#fef2f2' : '#f1f5f9', color: w.change > 0 ? '#16a34a' : w.change < 0 ? '#dc2626' : '#64748b', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13 }}>
                      {w.change >= 0 ? '+' : ''}{w.change}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: w.trend === 'up' ? '#22c55e' : w.trend === 'down' ? '#ef4444' : '#94a3b8', fontSize: 16 }}>{w.trend === 'up' ? '↑' : w.trend === 'down' ? '↓' : '→'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 3 Risks */}
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 16 }}>Top 3 Risks</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          {TOP_RISKS.map(risk => (
            <div key={risk.id} style={{ padding: 20, borderRadius: 14, border: `1px solid ${getSeverityColor(risk.severity)}30`, background: `${getSeverityColor(risk.severity)}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ background: getSeverityColor(risk.severity), color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{risk.severity}</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{risk.title}</h3>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{risk.description}</p>
              <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                <span style={{ color: '#64748b' }}><strong>Affected:</strong> {risk.affectedArea}</span>
                <span style={{ color: '#6366f1' }}><strong>Action:</strong> {risk.suggestedAction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
