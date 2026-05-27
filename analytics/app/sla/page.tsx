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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

interface SLAMetric {
  name: string;
  target: number;   // %
  actual: number;   // %
  breaches: number;
}

const METRICS: SLAMetric[] = [
  { name: 'API Availability',    target: 99.9,  actual: 99.94, breaches: 0 },
  { name: 'Response Time P95',   target: 99.0,  actual: 98.20, breaches: 3 },
  { name: 'Error Rate < 0.1%',   target: 99.9,  actual: 99.72, breaches: 1 },
  { name: 'Gist Delivery',       target: 99.5,  actual: 99.61, breaches: 0 },
  { name: 'Auth Success Rate',   target: 99.8,  actual: 99.85, breaches: 0 },
  { name: 'Data Sync Latency',   target: 98.0,  actual: 97.40, breaches: 4 },
];

const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const complianceTrend = [97.2, 98.1, 98.8, 99.0, 98.5, 99.1];
const breachTrend     = [8, 6, 4, 3, 5, 2];

const trendData = {
  labels: months,
  datasets: [{
    label: 'Compliance %',
    data: complianceTrend,
    borderColor: 'rgba(99,102,241,1)',
    backgroundColor: 'rgba(99,102,241,0.08)',
    tension: 0.4,
    fill: true,
    pointRadius: 4,
    yAxisID: 'y',
  }],
};

const breachData = {
  labels: months,
  datasets: [{
    label: 'Breaches',
    data: breachTrend,
    backgroundColor: breachTrend.map((v) => v > 5 ? 'rgba(239,68,68,0.8)' : 'rgba(234,179,8,0.8)'),
    borderRadius: 4,
  }],
};

const lineOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { min: 95, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}%` }, border: { display: false } },
  },
};

const barOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
  },
};

const overallCompliance = (METRICS.filter((m) => m.actual >= m.target).length / METRICS.length * 100).toFixed(0);
const totalBreaches = METRICS.reduce((s, m) => s + m.breaches, 0);
const atRisk = METRICS.filter((m) => m.actual < m.target).length;

export default function SLAPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>SLA Compliance Dashboard</h1>
        <p style={{ margin: 0, color: '#475569' }}>Track SLA targets, breach alerts, and compliance trends.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Overall Compliance',  value: `${overallCompliance}%`,       color: parseInt(overallCompliance) >= 80 ? '#16a34a' : '#dc2626' },
          { label: 'Total Breaches (MTD)', value: totalBreaches.toString(),      color: totalBreaches > 0 ? '#dc2626' : '#16a34a' },
          { label: 'SLAs At Risk',         value: atRisk.toString(),             color: atRisk > 0 ? '#ca8a04' : '#16a34a' },
          { label: 'SLAs Met',             value: `${METRICS.length - atRisk} / ${METRICS.length}`, color: '#6366f1' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* SLA targets vs actual table */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>SLA Targets vs Actual</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Metric', 'Target', 'Actual', 'Δ', 'Breaches', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m, i) => {
                const met = m.actual >= m.target;
                const delta = (m.actual - m.target).toFixed(2);
                return (
                  <tr key={m.name} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.target}%</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: met ? '#16a34a' : '#dc2626' }}>{m.actual}%</td>
                    <td style={{ padding: '10px 14px', color: met ? '#16a34a' : '#dc2626' }}>{met ? '+' : ''}{delta}%</td>
                    <td style={{ padding: '10px 14px' }}>
                      {m.breaches > 0
                        ? <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{m.breaches}</span>
                        : <span style={{ color: '#94a3b8' }}>0</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: met ? '#dcfce7' : '#fee2e2', color: met ? '#16a34a' : '#dc2626' }}>
                        {met ? '✓ Met' : '✗ Breached'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Compliance % Trend</h2>
          <Line data={trendData} options={lineOpts} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Monthly Breach Count</h2>
          <Bar data={breachData} options={barOpts} />
        </div>
      </div>
    </main>
  );
}
