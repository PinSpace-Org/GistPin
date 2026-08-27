'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  generateExpiryPredictions,
  getModelAccuracy,
  getTTLRecommendations,
  getRiskDistribution,
  getMonthlyExpiryTrend,
} from '@/lib/expiry-model';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function ExpiryPredictionsPage() {
  const predictions = generateExpiryPredictions();
  const accuracy = getModelAccuracy();
  const recommendations = getTTLRecommendations(predictions);
  const riskDist = getRiskDistribution(predictions);
  const trend = getMonthlyExpiryTrend();

  const atRisk = predictions.filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high');

  const riskDistData = {
    labels: riskDist.map((r) => r.level.charAt(0).toUpperCase() + r.level.slice(1)),
    datasets: [{
      data: riskDist.map((r) => r.count),
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(234,179,8,0.8)', 'rgba(239,68,68,0.8)', 'rgba(153,27,27,0.8)'],
      borderWidth: 0,
    }],
  };

  const trendData = {
    labels: trend.labels,
    datasets: [
      {
        label: 'Predicted Expiry',
        data: trend.predicted,
        borderColor: 'rgba(239,68,68,1)',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Actual Expiry',
        data: trend.expired,
        borderColor: 'rgba(99,102,241,1)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Saved by Extension',
        data: trend.saved,
        borderColor: 'rgba(34,197,94,1)',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const accuracyData = {
    labels: accuracy.monthlyAccuracy.map((m) => m.month),
    datasets: [{
      label: 'Model Accuracy (%)',
      data: accuracy.monthlyAccuracy.map((m) => m.accuracy),
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: 'rgba(99,102,241,1)',
    }],
  };

  const riskScoreData = {
    labels: predictions.map((p) => p.title.slice(0, 12) + '…'),
    datasets: [{
      label: 'Risk Score',
      data: predictions.map((p) => p.riskScore),
      backgroundColor: predictions.map((p) =>
        p.riskLevel === 'critical' ? 'rgba(153,27,27,0.8)' :
        p.riskLevel === 'high' ? 'rgba(239,68,68,0.8)' :
        p.riskLevel === 'medium' ? 'rgba(234,179,8,0.8)' :
        'rgba(34,197,94,0.8)'
      ),
      borderRadius: 3,
    }],
  };

  const getRiskColor = (level: string) => {
    if (level === 'critical') return '#991b1b';
    if (level === 'high') return '#ef4444';
    if (level === 'medium') return '#eab308';
    return '#22c55e';
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Content Expiry Prediction Model</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          ML-driven predictions for gist content expiry, risk scoring, and TTL extension recommendations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Predictions', value: accuracy.totalPredictions.toLocaleString(), sub: 'all-time' },
          { label: 'Model Accuracy', value: `${accuracy.accuracy}%`, sub: `F1: ${accuracy.f1Score}` },
          { label: 'At-Risk Gists', value: atRisk.length.toString(), sub: 'high + critical' },
          { label: 'TTL Extensions', value: recommendations.length.toString(), sub: 'recommended' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 700 }}>{value}</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Risk Score Distribution</h3>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <Doughnut data={riskDistData} options={{ responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#6b7280' } } } }} />
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Model Accuracy Over Time</h3>
          <Line data={accuracyData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 70, max: 90, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } }, x: { grid: { display: false }, ticks: { color: '#9ca3af' } } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Monthly Expiry Trend</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 12 } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } }, x: { grid: { display: false }, ticks: { color: '#9ca3af' } } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Risk Score by Gist</h3>
          <Bar data={riskScoreData} options={{ responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' } }, y: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } } } }} height={300} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Model Performance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Precision', value: `${accuracy.precision}%` },
              { label: 'Recall', value: `${accuracy.recall}%` },
              { label: 'F1 Score', value: `${accuracy.f1Score}%` },
              { label: 'Correct', value: `${accuracy.correctPredictions}/${accuracy.totalPredictions}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#6366f1' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>At-Risk Content</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Gist</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Language</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Risk</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Confidence</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Trend</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Views</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Reactions</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((p) => (
                <tr key={p.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.title}</td>
                  <td style={{ padding: '8px 12px' }}>{p.language}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: getRiskColor(p.riskLevel) + '22', color: getRiskColor(p.riskLevel), padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {p.riskScore}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{(p.confidence * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', color: p.engagementTrend === 'declining' ? '#ef4444' : p.engagementTrend === 'stable' ? '#eab308' : '#22c55e', textTransform: 'capitalize' }}>
                    {p.engagementTrend}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{p.viewCount}</td>
                  <td style={{ padding: '8px 12px' }}>{p.reactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>TTL Extension Recommendations</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Gist</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Current TTL</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Recommended</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Reason</th>
                <th style={{ padding: '8px 12px', color: '#6b7280' }}>Engagement Gain</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((r) => (
                <tr key={r.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: '8px 12px' }}>{r.currentTtl}</td>
                  <td style={{ padding: '8px 12px', color: '#22c55e', fontWeight: 600 }}>{r.recommendedTtl}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280', maxWidth: 300 }}>{r.reason}</td>
                  <td style={{ padding: '8px 12px', color: '#6366f1', fontWeight: 600 }}>+{r.potentialEngagementGain}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
