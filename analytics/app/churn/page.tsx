'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { AT_RISK_USERS, CHURN_FACTORS } from '../../lib/churn-prediction';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const RETENTION_ACTIONS = [
  'Send re-engagement email with local gist highlights',
  'Offer bonus visibility for next 3 gist posts',
  'Prompt with nearby trending topics',
  'Invite to local community event thread',
];

export default function ChurnPage() {
  const riskData = {
    labels: AT_RISK_USERS.map((u) => u.name),
    datasets: [
      {
        label: 'Risk Score',
        data: AT_RISK_USERS.map((u) => u.riskScore),
        backgroundColor: AT_RISK_USERS.map((u) =>
          u.riskScore >= 75 ? 'rgba(239,68,68,0.8)' : u.riskScore >= 60 ? 'rgba(245,158,11,0.8)' : 'rgba(16,185,129,0.8)'
        ),
        borderRadius: 6,
      },
    ],
  };

  const factorData = {
    labels: CHURN_FACTORS.map((f) => f.factor),
    datasets: [
      {
        data: CHURN_FACTORS.map((f) => f.weight),
        backgroundColor: ['rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)', 'rgba(99,102,241,0.8)', 'rgba(16,185,129,0.8)', 'rgba(148,163,184,0.8)'],
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#fee2e2 100%)', borderRadius: 28, padding: '30px', boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Churn Prediction</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Churn Prediction Dashboard</h1>
        <p style={{ margin: 0, color: '#475569' }}>Identify at-risk users, understand churn drivers, and take targeted retention actions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>At-Risk Users — Risk Scores</h2>
          <Bar data={riskData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100 } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Churn Factors</h2>
          <Doughnut data={factorData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>At-Risk User List</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['User', 'Risk', 'Last Active', 'Gists', 'Engagement'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#64748b' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {AT_RISK_USERS.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: u.riskScore >= 75 ? '#fee2e2' : u.riskScore >= 60 ? '#fef3c7' : '#d1fae5', color: u.riskScore >= 75 ? '#dc2626' : u.riskScore >= 60 ? '#d97706' : '#059669', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{u.riskScore}</span>
                  </td>
                  <td style={{ padding: '10px', fontSize: 13 }}>{u.lastActive}</td>
                  <td style={{ padding: '10px', fontSize: 13 }}>{u.gists}</td>
                  <td style={{ padding: '10px', fontSize: 13 }}>{u.engagement}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Recommended Retention Actions</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
            {RETENTION_ACTIONS.map((action) => (
              <li key={action} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 12, fontSize: 14 }}>
                <span style={{ color: '#4f46e5', fontWeight: 800, fontSize: 16 }}>→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
