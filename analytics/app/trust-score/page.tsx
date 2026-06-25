'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { calculateTrustScore, MONTHLY_TRUST_TREND, SPAM_TREND, getTrustScoreColor } from '@/lib/trust-calc';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export default function TrustScorePage() {
  const trust = calculateTrustScore();

  const factorData = {
    labels: trust.factors.map((f) => f.label),
    datasets: [{
      label: 'Score / 100',
      data: trust.factors.map((f) => f.score),
      backgroundColor: trust.factors.map((f) => getTrustScoreColor(f.score)),
      borderRadius: 3,
    }],
  };

  const trendData = {
    labels: MONTHLY_TRUST_TREND.labels,
    datasets: [{
      label: 'Trust Score',
      data: MONTHLY_TRUST_TREND.data,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
    }],
  };

  const spamData = {
    labels: SPAM_TREND.labels,
    datasets: [{
      label: 'Spam Rate (%)',
      data: SPAM_TREND.data,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
    }],
  };

  const regionData = {
    labels: trust.regionScores.map((r) => r.region),
    datasets: [{
      label: 'Trust Score',
      data: trust.regionScores.map((r) => r.score),
      backgroundColor: trust.regionScores.map((r) => getTrustScoreColor(r.score)),
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Platform Trust Score</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Aggregate trust metrics and anomaly detection for platform health.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Overall Trust Score</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: getTrustScoreColor(trust.overall) }}>{trust.overall}/100</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>On-Chain Verification</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{trust.factors[0].score}%</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Content Authenticity</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{trust.factors[1].score}/100</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Active Alerts</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: trust.anomalyAlerts.some((a) => a.severity === 'high') ? '#ef4444' : '#eab308' }}>{trust.anomalyAlerts.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Trust Score Factors</h3>
          <Bar data={factorData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } }, indexAxis: 'y' }} height={120} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Monthly Trust Trend</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Trust Score by Region</h3>
          <Bar data={regionData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} height={100} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Spam Rate Trend</h3>
          <Line data={spamData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Anomaly Detection Alerts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trust.anomalyAlerts.map((a) => (
            <div
              key={a.label}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: a.severity === 'high' ? '#fecaca' : a.severity === 'medium' ? '#fde68a' : '#d1d5db',
                background: a.severity === 'high' ? '#fef2f2' : a.severity === 'medium' ? '#fffbeb' : '#f9fafb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{a.detail}</div>
              </div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: a.severity === 'high' ? '#fecaca' : a.severity === 'medium' ? '#fde68a' : '#d1d5db',
                  color: a.severity === 'high' ? '#dc2626' : a.severity === 'medium' ? '#d97706' : '#4b5563',
                  textTransform: 'capitalize',
                }}
              >
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
