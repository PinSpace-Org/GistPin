'use client';

import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const CATEGORIES = [
  { label: 'Tech',        count: 3420, pct: 28, keywords: ['blockchain', 'Stellar', 'web3', 'API'],     misclass: 3.2 },
  { label: 'Finance',     count: 2810, pct: 23, keywords: ['XLM', 'tips', 'wallet', 'payment'],         misclass: 4.1 },
  { label: 'Food',        count: 1950, pct: 16, keywords: ['restaurant', 'recipe', 'review'],           misclass: 5.0 },
  { label: 'Safety',      count: 1420, pct: 12, keywords: ['alert', 'emergency', 'crime'],              misclass: 2.8 },
  { label: 'Events',      count: 1100, pct: 9,  keywords: ['meetup', 'conference', 'hackathon'],        misclass: 3.5 },
  { label: 'News',        count: 870,  pct: 7,  keywords: ['headline', 'update', 'announcement'],       misclass: 6.2 },
  { label: 'Transit',     count: 380,  pct: 3,  keywords: ['bus', 'train', 'traffic'],                  misclass: 2.1 },
  { label: 'Other',       count: 250,  pct: 2,  keywords: ['misc', 'general'],                          misclass: 8.4 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const TREND = {
  Tech:    [280, 310, 340, 370, 400, 420],
  Finance: [240, 255, 270, 290, 310, 330],
  Food:    [180, 185, 190, 200, 210, 195],
  Safety:  [120, 130, 140, 150, 145, 140],
};

const OVERRIDES = [
  { gistId: 'G-301', autoCategory: 'Finance', manualCategory: 'Food',   reason: 'Receipt tip', timestamp: '2026-06-24 14:32' },
  { gistId: 'G-298', autoCategory: 'News',     manualCategory: 'Safety', reason: 'Emergency alert', timestamp: '2026-06-24 11:15' },
  { gistId: 'G-295', autoCategory: 'Tech',     manualCategory: 'Events', reason: 'Hackathon post', timestamp: '2026-06-23 09:40' },
];

export default function CategoriesPage() {
  const pieData = {
    labels: CATEGORIES.map((c) => `${c.label} (${c.pct}%)`),
    datasets: [{
      data: CATEGORIES.map((c) => c.count),
      backgroundColor: [
        'rgba(59,130,246,0.8)', 'rgba(34,197,94,0.8)', 'rgba(251,191,36,0.8)',
        'rgba(239,68,68,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)',
        'rgba(14,165,233,0.8)', 'rgba(234,179,8,0.8)',
      ],
      borderWidth: 0,
    }],
  };

  const trendData = {
    labels: MONTHS,
    datasets: Object.entries(TREND).map(([label, data], i) => ({
      label,
      data,
      borderColor: ['rgba(59,130,246,1)', 'rgba(34,197,94,1)', 'rgba(251,191,36,1)', 'rgba(239,68,68,1)'][i],
      backgroundColor: ['rgba(59,130,246,0.05)', 'rgba(34,197,94,0.05)', 'rgba(251,191,36,0.05)', 'rgba(239,68,68,0.05)'][i],
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    })),
  };

  const misclassData = {
    labels: CATEGORIES.map((c) => c.label),
    datasets: [{
      label: 'Misclassification Rate (%)',
      data: CATEGORIES.map((c) => c.misclass),
      backgroundColor: CATEGORIES.map((c) =>
        c.misclass > 5 ? 'rgba(239,68,68,0.7)' : c.misclass > 3 ? 'rgba(251,191,36,0.7)' : 'rgba(34,197,94,0.7)'
      ),
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Content Category Classifier</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Auto-categorised gist content types with quality metrics.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Categorised', value: '12,200' },
          { label: 'Categories', value: '8' },
          { label: 'Avg Misclassification', value: '4.4%' },
          { label: 'Manual Overrides', value: '47' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Category Distribution</h3>
          <Pie data={pieData} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Category Trend</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Misclassification Rate by Category</h3>
        <Bar data={misclassData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 10, title: { display: true, text: '%' } } } }} height={60} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Top Keywords per Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {CATEGORIES.slice(0, 4).map((c) => (
            <div key={c.label} style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.keywords.map((kw) => (
                  <span key={kw} style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.1)', borderRadius: 10, fontSize: 12 }}>{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Manual Override Tracking</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Gist</th>
              <th style={{ padding: '8px 12px' }}>Auto Category</th>
              <th style={{ padding: '8px 12px' }}>Manual Category</th>
              <th style={{ padding: '8px 12px' }}>Reason</th>
              <th style={{ padding: '8px 12px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {OVERRIDES.map((o) => (
              <tr key={o.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.gistId}</td>
                <td style={{ padding: '8px 12px' }}>{o.autoCategory}</td>
                <td style={{ padding: '8px 12px' }}>{o.manualCategory}</td>
                <td style={{ padding: '8px 12px' }}>{o.reason}</td>
                <td style={{ padding: '8px 12px' }}>{o.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
