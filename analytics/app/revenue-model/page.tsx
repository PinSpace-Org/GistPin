'use client';

import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { getRevenueStreams, getRevenueHistory, getTotalRevenue } from '@/lib/revenue-model';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function RevenueModelPage() {
  const streams = getRevenueStreams();
  const history = getRevenueHistory();
  const [view, setView] = useState<'monthly' | 'cumulative'>('monthly');

  const pieData = {
    labels: streams.map((s) => s.name),
    datasets: [{
      data: streams.map((s) => s.monthly),
      backgroundColor: streams.map((s) => s.color),
      borderWidth: 0,
    }],
  };

  const histData = {
    labels: history.map((h) => h.month),
    datasets: streams.map((s) => ({
      label: s.name,
      data: history.map((h) => h.streams.find((hs) => hs.name === s.name)?.value ?? 0),
      backgroundColor: s.color + 'cc',
      borderRadius: 2,
    })),
  };

  const growthData = {
    labels: streams.map((s) => s.name),
    datasets: [{
      label: 'MoM Growth (%)',
      data: streams.map((s) => s.growth),
      backgroundColor: streams.map((s) => s.color),
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Revenue Model</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Revenue breakdown by stream, growth rates, and forecasting.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Total Monthly Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>${getTotalRevenue().toLocaleString()}</div>
        </div>
        {streams.slice(0, 3).map((s) => (
          <div key={s.name} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>${s.monthly.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: s.growth > 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
              {s.growth > 0 ? '↑' : '↓'} {Math.abs(s.growth)}% MoM
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Revenue Distribution</h3>
          <Pie data={pieData} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>MoM Growth by Stream</h3>
          <Bar data={growthData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } } }} height={80} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Revenue History</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['monthly', 'cumulative'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  border: '1px solid',
                  borderColor: view === v ? '#6366f1' : '#e5e7eb',
                  background: view === v ? '#6366f1' : '#fff',
                  color: view === v ? '#fff' : '#374151',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Bar data={histData} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { stacked: view === 'cumulative' },
            y: { stacked: view === 'cumulative', beginAtZero: true, title: { display: true, text: 'Revenue ($)' } },
          },
        }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Revenue Stream Details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Stream</th>
              <th style={{ padding: '8px 12px' }}>Monthly</th>
              <th style={{ padding: '8px 12px' }}>Growth</th>
              <th style={{ padding: '8px 12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((s) => (
              <tr key={s.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '8px 12px' }}>${s.monthly.toLocaleString()}</td>
                <td style={{ padding: '8px 12px', color: s.growth > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {s.growth > 0 ? '+' : ''}{s.growth}%
                </td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
