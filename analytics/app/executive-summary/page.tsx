'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  getExecutiveSummary,
  getTrafficLightColor,
  getTrafficLightBg,
  type TrafficLight,
} from '@/lib/summary-generator';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const CARD = { background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' } as const;

const SEVERITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  high:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  medium: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  low:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

const HEALTH_TREND = [96, 97, 95, 98, 96, 94, 93, 95, 92, 94, 93, 91];
const HEALTH_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

export default function ExecutiveSummaryPage() {
  const summary = getExecutiveSummary();
  const [exporting, setExporting] = useState(false);

  const wowChangeData = {
    labels: summary.weekOverWeek.map((w) => w.metric),
    datasets: [{
      label: 'Change %',
      data: summary.weekOverWeek.map((w) => w.changePct),
      backgroundColor: summary.weekOverWeek.map((w) =>
        w.changePct > 5 ? 'rgba(34,197,94,0.7)' :
        w.changePct > 0 ? 'rgba(251,191,36,0.7)' :
        'rgba(239,68,68,0.6)'
      ),
      borderRadius: 5,
    }],
  };

  const healthTrendData = {
    labels: HEALTH_LABELS,
    datasets: [{
      label: 'Health Score',
      data: HEALTH_TREND,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      borderWidth: 2.5,
    }],
  };

  const handleExportPDF = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setExporting(false);
    alert('PDF export queued. In production this would generate a downloadable executive summary report.');
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)', borderRadius: 22, padding: 32, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, color: '#111827' }}>Platform Health Executive Summary</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Key metrics, traffic light indicators, week-over-week comparison, and top risks for leadership review.</p>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13 }}>Report Date: {summary.reportDate}</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          style={{
            border: 'none',
            borderRadius: 999,
            background: exporting ? '#c7d2fe' : '#312e81',
            color: '#fff',
            padding: '12px 22px',
            fontSize: 14,
            fontWeight: 700,
            cursor: exporting ? 'wait' : 'pointer',
            boxShadow: '0 12px 30px rgba(49,46,129,0.22)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {exporting ? 'Generating…' : '📄 Export PDF'}
        </button>
      </div>

      {/* Overall health indicator */}
      <div style={{ ...CARD, borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Overall Platform Health:</span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 20,
          background: getTrafficLightBg(summary.overallHealth),
          color: getTrafficLightColor(summary.overallHealth),
          fontSize: 14,
          fontWeight: 700,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: getTrafficLightColor(summary.overallHealth) }} />
          {summary.overallHealth.toUpperCase()}
        </span>
      </div>

      {/* KPI Grid with traffic lights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }} data-report-section data-report-title="Key Metrics Snapshot">
        {summary.snapshot.map((m) => (
          <div key={m.label} style={{ ...CARD, borderRadius: 16, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{m.label}</span>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: getTrafficLightColor(m.trafficLight),
              }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{m.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: m.changePct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {m.changePct >= 0 ? '↑' : '↓'} {Math.abs(m.changePct)}%
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>vs last period</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} data-report-section data-report-title="Week-over-Week & Health Trend">
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Week-over-Week Comparison</h3>
          <Bar data={wowChangeData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 45, font: { size: 11 } } },
              y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}%` } },
            },
          }} height={100} />
        </div>
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>12-Week Health Trend</h3>
          <Line data={healthTrendData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
              y: { min: 85, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}%` } },
            },
          }} height={100} />
        </div>
      </div>

      {/* WoW detail table */}
      <div style={CARD} data-report-section data-report-title="Week-over-Week Detail" style={{ ...CARD, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Week-over-Week Detail</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px' }}>Metric</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Previous</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Current</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Change</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {summary.weekOverWeek.map((w) => (
              <tr key={w.metric} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 10px', fontWeight: 600 }}>{w.metric}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>{w.previous.toLocaleString()}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>{w.current.toLocaleString()}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', color: w.changePct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {w.changePct >= 0 ? '+' : ''}{w.changePct}%
                </td>
                <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                  <span style={{ fontSize: 16 }}>{w.trend === 'up' ? '📈' : w.trend === 'down' ? '📉' : '➡️'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Risks */}
      <div data-report-section data-report-title="Top 3 Risks">
        <h3 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>Top 3 Risks</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {summary.topRisks.map((risk) => {
            const sev = SEVERITY_STYLE[risk.severity];
            return (
              <div key={risk.id} style={{ ...CARD, border: `2px solid ${sev.border}`, background: sev.bg, borderRadius: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{risk.id}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: sev.bg, color: sev.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${sev.border}` }}>
                        {risk.severity}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>{risk.title}</h4>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{risk.impact}</p>
                <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.12)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Recommendation</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>{risk.recommendation}</p>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>Owner: {risk.owner}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
