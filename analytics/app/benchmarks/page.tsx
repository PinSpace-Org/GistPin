'use client';

import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getBenchmarkData, getCategories } from '@/lib/benchmark-compare';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const categoryLabels: Record<string, string> = {
  general: 'General Performance',
  engagement: 'Engagement',
  quality: 'Content Quality',
  growth: 'Growth & Retention',
};

export default function BenchmarksPage() {
  const [category, setCategory] = useState<string>('general');
  const data = getBenchmarkData(category as any);
  const categories = getCategories();

  const chartData = {
    labels: data.metrics.map((m) => m.label),
    datasets: [
      {
        label: 'GistPin',
        data: data.metrics.map((m) => m.gistpin),
        backgroundColor: 'rgba(59,130,246,0.8)',
        borderRadius: 3,
      },
      {
        label: 'Industry Avg',
        data: data.metrics.map((m) => m.industry),
        backgroundColor: 'rgba(156,163,175,0.5)',
        borderRadius: 3,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Benchmark Comparison</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>GistPin metrics vs mock industry averages — {data.comparisonPeriod}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: category === cat ? '#6366f1' : '#e5e7eb',
              background: category === cat ? '#6366f1' : '#fff',
              color: category === cat ? '#fff' : '#374151',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Overall Benchmark Score</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.overall}/100</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Metrics Ahead</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
            {data.metrics.filter((m) => m.higherIsBetter ? m.gistpin > m.industry : m.gistpin < m.industry).length}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Metrics Behind</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>
            {data.metrics.filter((m) => m.higherIsBetter ? m.gistpin < m.industry : m.gistpin > m.industry).length}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>{categoryLabels[category]} — Side-by-Side</h3>
        <Bar data={chartData} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } },
        }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Detailed Comparison Table</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Metric</th>
              <th style={{ padding: '8px 12px' }}>GistPin</th>
              <th style={{ padding: '8px 12px' }}>Industry</th>
              <th style={{ padding: '8px 12px' }}>Unit</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => {
              const ahead = m.higherIsBetter ? m.gistpin > m.industry : m.gistpin < m.industry;
              return (
                <tr key={m.label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.label}</td>
                  <td style={{ padding: '8px 12px' }}>{m.gistpin}</td>
                  <td style={{ padding: '8px 12px' }}>{m.industry}</td>
                  <td style={{ padding: '8px 12px' }}>{m.unit}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: ahead ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: ahead ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {ahead ? 'Ahead' : 'Behind'}
                    </span>
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
