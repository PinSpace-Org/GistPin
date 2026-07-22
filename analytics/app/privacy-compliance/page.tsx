'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { getDataMinimizationMetrics, getAnonymousVsAttributed, getIpHashUsage, getDataRetention, getGdprScore } from '@/lib/privacy-metrics';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function PrivacyCompliancePage() {
  const metrics = getDataMinimizationMetrics();
  const anonVsAttr = getAnonymousVsAttributed();
  const ipHashData = getIpHashUsage();
  const retention = getDataRetention();
  const gdpr = getGdprScore();

  const anonChart = {
    labels: ['Anonymous', 'Attributed'],
    datasets: [{ data: [anonVsAttr.anonymous, anonVsAttr.attributed], backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(16,185,129,0.8)'] }],
  };

  const gdprChart = {
    labels: gdpr.categories.map(c => c.name),
    datasets: [{ label: 'Score', data: gdpr.categories.map(c => c.score), backgroundColor: gdpr.categories.map(c => c.score >= 95 ? 'rgba(16,185,129,0.8)' : 'rgba(245,158,11,0.8)'), borderRadius: 6 }],
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#dcfce7 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Privacy</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Privacy Compliance Analytics</h1>
        <p style={{ margin: 0, color: '#475569' }}>Monitor data minimization, GDPR compliance, and privacy metrics across the platform.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ flex: '1 1 180px', padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GDPR Score</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#16a34a' }}>{gdpr.overall}%</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anonymous Ratio</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{anonVsAttr.ratio}:1</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IP Hash Rate</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{ipHashData[ipHashData.length - 1].hashed}%</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data Minimization</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{metrics.find(m => m.label === 'IP addresses hashed')?.value}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Anonymous vs Attributed Users</h2>
          <Doughnut data={anonChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>GDPR Compliance by Category</h2>
          <Bar data={gdprChart} options={{ responsive: true, indexAxis: 'y' as const, plugins: { legend: { display: false } }, scales: { x: { min: 80, max: 100 } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Data Retention Compliance</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Category', 'Records', 'Max Age (days)', 'Compliant %'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 13, color: '#64748b' }}>{h}</th>)}</tr></thead>
          <tbody>
            {retention.map(r => (
              <tr key={r.category} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{r.category}</td>
                <td style={{ padding: 10 }}>{r.count.toLocaleString()}</td>
                <td style={{ padding: 10 }}>{r.maxAge}</td>
                <td style={{ padding: 10 }}><span style={{ background: r.compliant >= 95 ? '#d1fae5' : '#fef3c7', color: r.compliant >= 95 ? '#059669' : '#d97706', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{r.compliant}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Data Minimization Metrics</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</span>
              <span style={{ background: m.status === 'compliant' ? '#d1fae5' : '#fef3c7', color: m.status === 'compliant' ? '#059669' : '#d97706', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{m.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
