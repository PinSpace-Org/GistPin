'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getPredictions, getHistoricalTrend, getConfidenceInterval } from '@/lib/peak-predictor';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function PredictionsPage() {
  const predictions = getPredictions();
  const trend = getHistoricalTrend();

  const predBar = {
    labels: predictions.map((p) => p.label),
    datasets: [
      {
        label: 'Current',
        data: predictions.map((p) => p.currentValue),
        backgroundColor: 'rgba(107,114,128,0.5)',
        borderRadius: 3,
      },
      {
        label: 'Predicted',
        data: predictions.map((p) => p.predictedValue),
        backgroundColor: 'rgba(99,102,241,0.8)',
        borderRadius: 3,
      },
    ],
  };

  const trendData = {
    labels: trend.map((t) => t.month),
    datasets: [
      {
        label: 'Actual',
        data: trend.map((t) => t.actual || null),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        spanGaps: false,
      },
      {
        label: 'Predicted',
        data: trend.map((t) => t.predicted),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        borderDash: [6, 4],
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Peak Prediction Engine</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>ML-powered forecasts for platform metrics with confidence intervals.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Predictions', value: '6' },
          { label: 'Avg Confidence',     value: '82%' },
          { label: 'Forecast Horizon',   value: '3 months' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Current vs Predicted</h3>
        <Bar data={predBar} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={100} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Historical & Forecast Trend</h3>
        <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={80} />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          Solid line = actual data, dashed line = predicted forecast. (DAU shown)
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Prediction Details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Metric</th>
              <th style={{ padding: '8px 12px' }}>Current</th>
              <th style={{ padding: '8px 12px' }}>Predicted</th>
              <th style={{ padding: '8px 12px' }}>Unit</th>
              <th style={{ padding: '8px 12px' }}>Confidence</th>
              <th style={{ padding: '8px 12px' }}>Direction</th>
              <th style={{ padding: '8px 12px' }}>Confidence Interval</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => {
              const ci = getConfidenceInterval(p.label);
              return (
                <tr key={p.label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.label}</td>
                  <td style={{ padding: '8px 12px' }}>{p.currentValue}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#6366f1' }}>{p.predictedValue}</td>
                  <td style={{ padding: '8px 12px' }}>{p.unit}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 50, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ width: `${p.confidence}%`, height: '100%', borderRadius: 3, background: p.confidence >= 80 ? '#22c55e' : p.confidence >= 60 ? '#eab308' : '#ef4444' }} />
                      </div>
                      <span>{p.confidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      background: p.direction === 'up' ? 'rgba(34,197,94,0.15)' : p.direction === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                      color: p.direction === 'up' ? '#16a34a' : p.direction === 'down' ? '#dc2626' : '#6b7280',
                      textTransform: 'capitalize',
                    }}>
                      {p.direction === 'up' ? '↑' : p.direction === 'down' ? '↓' : '→'} {p.direction}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: '#6b7280' }}>
                    {ci.low} – {ci.high}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
