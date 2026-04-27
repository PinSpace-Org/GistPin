'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { calcLTV, calcRetentionLTV, cohortLTV } from '../../lib/ltv-calc';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function LTVPage() {
  const [arpu, setArpu] = useState(12);
  const [churn, setChurn] = useState(0.05);
  const [retention, setRetention] = useState(0.95);
  const [periods] = useState(12);

  const ltv = useMemo(() => calcLTV(arpu, churn), [arpu, churn]);
  const retentionCurve = useMemo(() => calcRetentionLTV(arpu, retention, periods), [arpu, retention, periods]);
  const cohorts = useMemo(() => cohortLTV(arpu, churn, 6), [arpu, churn]);

  const labels = Array.from({ length: periods }, (_, i) => `M${i + 1}`);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Cumulative LTV ($)',
        data: retentionCurve,
        borderColor: 'rgba(99,102,241,1)',
        backgroundColor: 'rgba(99,102,241,0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const cohortData = {
    labels: Array.from({ length: 6 }, (_, i) => `Cohort ${i + 1}`),
    datasets: [
      {
        label: 'LTV by Cohort ($)',
        data: cohorts,
        borderColor: 'rgba(16,185,129,1)',
        backgroundColor: 'rgba(16,185,129,0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  function exportCsv() {
    const rows = [['Month', 'Cumulative LTV'], ...retentionCurve.map((v, i) => [`M${i + 1}`, v])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ltv-projections.csv';
    a.click();
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#ede9fe 100%)', borderRadius: 28, padding: '30px', boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>LTV Calculator</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Lifetime Value Calculator</h1>
        <p style={{ margin: 0, color: '#475569' }}>Calculate and project customer lifetime value using ARPU, churn, and retention inputs.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'ARPU ($/month)', value: arpu, min: 1, max: 500, step: 1, set: setArpu },
          { label: 'Churn Rate (0–1)', value: churn, min: 0.01, max: 1, step: 0.01, set: setChurn },
          { label: 'Retention Rate (0–1)', value: retention, min: 0.01, max: 1, step: 0.01, set: setRetention },
        ].map(({ label, value, min, max, step, set }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid rgba(148,163,184,0.16)' }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
              <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15 }} />
            </label>
          </div>
        ))}
        <div style={{ background: '#4f46e5', borderRadius: 18, padding: 20, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Calculated LTV</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>${ltv.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 20 }}>
        {[
          { title: 'Cumulative LTV over 12 months', data: chartData },
          { title: 'LTV by Cohort', data: cohortData },
        ].map(({ title, data }) => (
          <div key={title} style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
            <Line data={data} options={chartOptions} />
          </div>
        ))}
      </div>

      <button type="button" onClick={exportCsv} style={{ border: 'none', borderRadius: 999, background: '#4f46e5', color: '#fff', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
        Export Projections CSV
      </button>
    </main>
  );
}
