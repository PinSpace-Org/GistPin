'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DEFAULT_STAGES = [
  { name: 'Visitors', count: 10000 },
  { name: 'Sign-ups', count: 3200 },
  { name: 'Activated', count: 1800 },
  { name: 'Retained', count: 900 },
  { name: 'Paying', count: 320 },
];

interface Stage { name: string; count: number }

export default function ConversionCalcPage() {
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);

  const conversions = useMemo(() =>
    stages.map((s, i) => ({
      ...s,
      rate: i === 0 ? 100 : stages[i - 1].count > 0 ? parseFloat(((s.count / stages[i - 1].count) * 100).toFixed(1)) : 0,
      overall: stages[0].count > 0 ? parseFloat(((s.count / stages[0].count) * 100).toFixed(1)) : 0,
    })),
    [stages]
  );

  function updateStage(i: number, field: keyof Stage, value: string) {
    setStages((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: field === 'count' ? Number(value) : value } : s));
  }

  function exportCsv() {
    const rows = [['Stage', 'Count', 'Step Rate %', 'Overall %'], ...conversions.map((c) => [c.name, c.count, c.rate, c.overall])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conversion-funnel.csv';
    a.click();
  }

  const chartData = {
    labels: conversions.map((c) => c.name),
    datasets: [
      {
        label: 'Users',
        data: conversions.map((c) => c.count),
        backgroundColor: conversions.map((_, i) => `rgba(99,102,241,${1 - i * 0.15})`),
        borderRadius: 6,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#dcfce7 100%)', borderRadius: 28, padding: '30px', boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Conversion Calculator</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Conversion Rate Calculator</h1>
          <p style={{ margin: 0, color: '#475569' }}>Enter funnel stage counts to auto-calculate step-by-step and overall conversion rates.</p>
        </div>
        <button type="button" onClick={exportCsv} style={{ border: 'none', borderRadius: 999, background: '#16a34a', color: '#fff', padding: '12px 24px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>Export CSV</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Funnel Stages</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {stages.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={s.name} onChange={(e) => updateStage(i, 'name', e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                <input type="number" value={s.count} min={0} onChange={(e) => updateStage(i, 'count', e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Visual Funnel</h2>
          <Bar data={chartData} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Conversion Rates</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>{['Stage', 'Count', 'Step Rate', 'Overall Rate'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '10px', fontSize: 13, color: '#64748b', borderBottom: '2px solid #f1f5f9' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr key={c.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: '12px 10px' }}>{c.count.toLocaleString()}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ background: '#ede9fe', color: '#4f46e5', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{c.rate}%</span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{c.overall}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
