'use client';

import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const SIMILARITY_BANDS = [
  { range: '90-100%', count: 84,  label: 'Near-duplicate' },
  { range: '70-89%',  count: 142, label: 'High similarity' },
  { range: '50-69%',  count: 208, label: 'Moderate' },
  { range: '0-49%',   count: 56,  label: 'Low similarity' },
];

const CLUSTERS = [
  { id: 'C-1', content: 'Stellar tipping guides',        gists: 12, wallets: 8,  pct: 87 },
  { id: 'C-2', content: 'Restaurant review templates',   gists: 9,  wallets: 7,  pct: 79 },
  { id: 'C-3', content: 'Emergency contact lists',       gists: 7,  wallets: 5,  pct: 82 },
  { id: 'C-4', content: 'Event promotion copy',           gists: 6,  wallets: 4,  pct: 74 },
  { id: 'C-5', content: 'Crypto wallet addresses',        gists: 5,  wallets: 4,  pct: 91 },
];

const SAME_WALLET = [
  { wallet: 'GB7Z...X3K', gists: 4, duplicates: 3, pct: 75 },
  { wallet: 'GA1Q...R9L', gists: 3, duplicates: 2, pct: 67 },
  { wallet: 'GC4W...M2P', gists: 5, duplicates: 2, pct: 40 },
];

const CROSS_LOCATION = [
  { pair: 'NYC ↔ London', pct: 12.4 },
  { pair: 'Tokyo ↔ Seoul', pct: 9.8 },
  { pair: 'London ↔ Berlin', pct: 7.2 },
  { pair: 'São Paulo ↔ Buenos Aires', pct: 6.5 },
  { pair: 'Lagos ↔ Nairobi', pct: 5.1 },
];

const SPAM_PATTERNS = [
  { pattern: 'Same text, multiple wallets',     count: 210, flagged: true },
  { pattern: 'URL in every gist',               count: 145, flagged: true },
  { pattern: 'Identical timestamps',            count: 98,  flagged: true },
  { pattern: 'Template text with variations',   count: 76,  flagged: false },
  { pattern: 'Cross-posted across locations',   count: 54,  flagged: false },
];

export default function DuplicatesPage() {
  const simPie = {
    labels: SIMILARITY_BANDS.map((b) => `${b.range} (${b.label})`),
    datasets: [{
      data: SIMILARITY_BANDS.map((b) => b.count),
      backgroundColor: ['rgba(239,68,68,0.8)', 'rgba(251,191,36,0.8)', 'rgba(59,130,246,0.8)', 'rgba(34,197,94,0.8)'],
      borderWidth: 0,
    }],
  };

  const clusterBar = {
    labels: CLUSTERS.map((c) => `Cluster ${c.id}`),
    datasets: [
      { label: 'Gists', data: CLUSTERS.map((c) => c.gists), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 3 },
      { label: 'Wallets', data: CLUSTERS.map((c) => c.wallets), backgroundColor: 'rgba(251,191,36,0.7)', borderRadius: 3 },
    ],
  };

  const crossLocBar = {
    labels: CROSS_LOCATION.map((c) => c.pair),
    datasets: [{
      label: 'Duplicate Rate (%)',
      data: CROSS_LOCATION.map((c) => c.pct),
      backgroundColor: 'rgba(168,85,247,0.7)',
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Duplicate Content Detection</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Identify near-duplicate gists, same-wallet duplicates, and spam patterns.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Duplicates', value: '490' },
          { label: 'Duplicate Rate', value: '3.8%' },
          { label: 'Clusters Found', value: '5' },
          { label: 'Spam Patterns', value: '5' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Similarity Score Distribution</h3>
          <Pie data={simPie} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Duplicate Clusters</h3>
          <Bar data={clusterBar} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>Cluster</th>
                <th style={{ padding: '4px 8px' }}>Content</th>
                <th style={{ padding: '4px 8px' }}>Sim.</th>
              </tr>
            </thead>
            <tbody>
              {CLUSTERS.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 600 }}>{c.id}</td>
                  <td style={{ padding: '4px 8px' }}>{c.content}</td>
                  <td style={{ padding: '4px 8px' }}>{c.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Same-Wallet Duplicates</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Wallet</th>
                <th style={{ padding: '6px 10px' }}>Gists</th>
                <th style={{ padding: '6px 10px' }}>Duplicates</th>
                <th style={{ padding: '6px 10px' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {SAME_WALLET.map((w) => (
                <tr key={w.wallet} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{w.wallet}</td>
                  <td style={{ padding: '6px 10px' }}>{w.gists}</td>
                  <td style={{ padding: '6px 10px' }}>{w.duplicates}</td>
                  <td style={{ padding: '6px 10px', color: w.pct > 60 ? '#ef4444' : '#6b7280', fontWeight: 600 }}>{w.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Cross-Location Duplicate Rate</h3>
          <Bar data={crossLocBar} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } }, indexAxis: 'y' }} height={100} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Spam Pattern Detection</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Pattern</th>
              <th style={{ padding: '8px 12px' }}>Occurrences</th>
              <th style={{ padding: '8px 12px' }}>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {SPAM_PATTERNS.map((s) => (
              <tr key={s.pattern} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px' }}>{s.pattern}</td>
                <td style={{ padding: '8px 12px' }}>{s.count}</td>
                <td style={{ padding: '8px 12px', color: s.flagged ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                  {s.flagged ? 'Yes' : 'Needs review'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
