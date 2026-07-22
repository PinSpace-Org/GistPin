'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const TPS_DATA = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, tps: Math.round(40 + Math.sin(i / 5) * 15 + Math.random() * 5), gists: Math.round(80 + Math.sin(i / 5) * 20 + Math.random() * 10) }));
const FEE_DATA = Array.from({ length: 50 }, (_, i) => ({ fee: +(0.00001 + Math.random() * 0.0001).toFixed(6), success: Math.round(95 + Math.random() * 5) }));
const LEDGER_DATA = Array.from({ length: 24 }, (_, i) => ({ hour: i, avgTime: +(4 + Math.random() * 2).toFixed(1), p99Time: +(6 + Math.random() * 4).toFixed(1) }));
const OUTAGE_EVENTS = [
  { date: '2025-06-15', duration: 12, impact: 'High', gistsLost: 340, recovery: '8 min' },
  { date: '2025-07-02', duration: 5, impact: 'Medium', gistsLost: 120, recovery: '3 min' },
  { date: '2025-07-20', duration: 25, impact: 'Critical', gistsLost: 890, recovery: '15 min' },
];

export default function StellarCorrelationPage() {
  const tpsChart = {
    labels: TPS_DATA.map(d => `Day ${d.day}`),
    datasets: [
      { label: 'Stellar TPS', data: TPS_DATA.map(d => d.tps), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', yAxisID: 'y', tension: 0.3 },
      { label: 'Gists Posted', data: TPS_DATA.map(d => d.gists), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', yAxisID: 'y1', tension: 0.3 },
    ],
  };

  const feeChart = {
    datasets: [{ label: 'Fee vs Success Rate', data: FEE_DATA.map(d => ({ x: d.fee * 1000000, y: d.success })), backgroundColor: 'rgba(99,102,241,0.6)', pointRadius: 4 }],
  };

  const ledgerChart = {
    labels: LEDGER_DATA.map(d => `${d.hour}:00`),
    datasets: [
      { label: 'Avg Ledger Time (s)', data: LEDGER_DATA.map(d => d.avgTime), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4 },
      { label: 'P99 Ledger Time (s)', data: LEDGER_DATA.map(d => d.p99Time), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 },
    ],
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Stellar Network</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Stellar Network Health Correlation</h1>
        <p style={{ margin: 0, color: '#475569' }}>Correlate Stellar network metrics with platform activity and track outage impact.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Stellar TPS vs Gist Posting Rate</h2>
          <Line data={tpsChart} options={{ responsive: true, scales: { y: { position: 'left', title: { display: true, text: 'TPS' } }, y1: { position: 'right', title: { display: true, text: 'Gists' }, grid: { drawOnChartArea: false } } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Network Fee vs Transaction Success</h2>
          <Scatter data={feeChart} options={{ responsive: true, scales: { x: { title: { display: true, text: 'Fee (microXLM)' } }, y: { title: { display: true, text: 'Success Rate (%)' }, min: 90, max: 100 } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Ledger Time Distribution</h2>
          <Bar data={ledgerChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Network Outage Impact</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Duration', 'Impact', 'Gists Lost', 'Recovery'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#64748b' }}>{h}</th>)}</tr></thead>
            <tbody>
              {OUTAGE_EVENTS.map(e => (
                <tr key={e.date} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{e.date}</td>
                  <td style={{ padding: 10 }}>{e.duration} min</td>
                  <td style={{ padding: 10 }}><span style={{ background: e.impact === 'Critical' ? '#fee2e2' : e.impact === 'High' ? '#fef3c7' : '#d1fae5', color: e.impact === 'Critical' ? '#dc2626' : e.impact === 'High' ? '#d97706' : '#059669', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{e.impact}</span></td>
                  <td style={{ padding: 10 }}>{e.gistsLost}</td>
                  <td style={{ padding: 10 }}>{e.recovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
