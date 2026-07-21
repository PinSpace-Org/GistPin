'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import { getSentimentTrend, getSentimentSummary, getLocationSentiment, getCategorySentiment, correlateEventsWithSentiment, SentimentDataPoint } from '@/lib/sentiment-trend';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function SentimentTrend() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const data = useMemo(() => getSentimentTrend(period), [period]);
  const summary = useMemo(() => getSentimentSummary(data), [data]);
  const locations = useMemo(() => getLocationSentiment(), []);
  const categories = useMemo(() => getCategorySentiment(), []);
  const events = useMemo(() => correlateEventsWithSentiment(), []);

  const chartData = useMemo(() => ({
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Sentiment Score',
        data: data.map((d) => d.score),
        borderColor: summary.trend === 'improving' ? '#22c55e' : summary.trend === 'declining' ? '#ef4444' : '#f59e0b',
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99,102,241,0.2)');
          gradient.addColorStop(1, 'rgba(99,102,241,0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: period === 7 ? 4 : 2,
        pointHitRadius: 6,
      },
      {
        label: 'Alert Threshold (40)',
        data: data.map(() => 40),
        borderColor: '#ef4444',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
    ],
  }), [data, summary.trend]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: summary.trend === 'improving' ? '#22c55e' : summary.trend === 'declining' ? '#ef4444' : '#f59e0b' }}>
            {summary.overallScore}
          </span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {summary.trend === 'improving' ? '↑ Improving' : summary.trend === 'declining' ? '↓ Declining' : '→ Stable'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([7, 30, 90] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '4px 12px', borderRadius: 999, border: '1px solid',
                borderColor: period === p ? '#6366f1' : '#d1d5db',
                background: period === p ? '#6366f1' : 'transparent',
                color: period === p ? '#fff' : '#374151',
                fontWeight: 600, fontSize: 11, cursor: 'pointer',
              }}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Positive', value: `${summary.positivePct}%`, color: '#22c55e' },
          { label: 'Neutral',  value: `${summary.neutralPct}%`,  color: '#f59e0b' },
          { label: 'Negative', value: `${summary.negativePct}%`, color: '#ef4444' },
          { label: 'Analyzed', value: summary.totalAnalyzed.toLocaleString(), color: '#6b7280' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Sentiment Score Over Time</h3>
        <Line data={chartData} options={{
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              backgroundColor: 'rgba(17,24,39,0.9)',
              titleColor: '#f9fafb',
              bodyColor: '#c7d2fe',
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
            x: { ticks: { maxTicksLimit: 12 } },
          },
        }} />
      </div>

      {summary.alerts.length > 0 && (
        <div style={{ background: '#fef2f2', borderRadius: 16, padding: '16px 20px', border: '1px solid #fecaca' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#991b1b' }}>Alerts</h4>
          {summary.alerts.map((alert, i) => (
            <p key={i} style={{ margin: '4px 0', fontSize: 13, color: '#b91c1c' }}>⚠ {alert}</p>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Location-Based Sentiment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {locations.map((loc) => (
              <div key={loc.location} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 120, fontSize: 13, fontWeight: 500, color: '#374151' }}>{loc.location}</span>
                <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${loc.score}%`, height: '100%', background: loc.score >= 65 ? '#22c55e' : loc.score >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111827' }}>{loc.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Sentiment by Category</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 80, fontSize: 13, fontWeight: 500, color: '#374151' }}>{cat.category}</span>
                <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${cat.score}%`, height: '100%', background: cat.score >= 65 ? '#22c55e' : cat.score >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111827' }}>{cat.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Event Correlation</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Event</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Date</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Before</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>After</th>
              <th style={{ padding: '8px 10px', color: '#6b7280' }}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.event} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>{e.event}</td>
                <td style={{ padding: '10px', color: '#6b7280' }}>{e.date}</td>
                <td style={{ padding: '10px' }}>{e.beforeScore}</td>
                <td style={{ padding: '10px' }}>{e.afterScore}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    background: e.impact === 'positive' ? '#f0fdf4' : '#fef2f2',
                    color: e.impact === 'positive' ? '#22c55e' : '#ef4444',
                    borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>
                    {e.impact}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
