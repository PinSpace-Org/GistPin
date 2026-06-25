'use client';

import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { convertXlm, formatCurrency, CURRENCIES, SAMPLE_TIPS, type Currency } from '@/lib/currency-convert';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const XLM_TOTALS = [8200, 9500, 11200, 13400, 15800, 18200];

const TOP_CONTENT = [
  { gistId: 'G-0987', title: 'Incredible photo collection',  xlm: 200 },
  { gistId: 'G-0995', title: 'Best event coverage this year', xlm: 120 },
  { gistId: 'G-0978', title: 'Brilliant hackathon project',   xlm: 85 },
  { gistId: 'G-1001', title: 'Great restaurant guide!',      xlm: 50 },
  { gistId: 'G-0982', title: 'Saved my day with this info',   xlm: 40 },
];

export default function TipValuesPage() {
  const [currency, setCurrency] = useState<Currency>('USD');

  const xlmPrice = convertXlm(1, currency);

  const trendData = {
    labels: MONTHS,
    datasets: [
      {
        label: `XLM Tips (${currency})`,
        data: XLM_TOTALS.map((x) => convertXlm(x, currency)),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const totalXlm = XLM_TOTALS[XLM_TOTALS.length - 1];
  const convertedTotal = convertXlm(totalXlm, currency);

  const tipsData = {
    labels: TOP_CONTENT.map((t) => t.title.slice(0, 20) + '...'),
    datasets: [{
      label: `XLM (${currency})`,
      data: TOP_CONTENT.map((t) => convertXlm(t.xlm, currency)),
      backgroundColor: 'rgba(251,191,36,0.7)',
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Tip Value Optimizer</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          XLM tip values converted to multiple currencies.{' '}
          1 XLM = {formatCurrency(xlmPrice, currency)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {CURRENCIES.map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: currency === c ? '#6366f1' : '#e5e7eb',
              background: currency === c ? '#6366f1' : '#fff',
              color: currency === c ? '#fff' : '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: `Total Tips (${currency})`,     value: formatCurrency(convertedTotal, currency) },
          { label: 'XLM Price',                     value: formatCurrency(xlmPrice, currency) },
          { label: 'Avg Tip (XLM)',                 value: `${(totalXlm / SAMPLE_TIPS.length).toFixed(1)} XLM` },
          { label: 'Tips This Month',               value: '1,247' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Tip Value Trend ({currency})</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Top Tipped Content</h3>
          <Bar data={tipsData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, indexAxis: 'y' }} height={120} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Recent Tips</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Gist</th>
              <th style={{ padding: '8px 12px' }}>Content</th>
              <th style={{ padding: '8px 12px' }}>XLM</th>
              <th style={{ padding: '8px 12px' }}>{currency}</th>
              <th style={{ padding: '8px 12px' }}>Location</th>
              <th style={{ padding: '8px 12px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TIPS.map((t) => (
              <tr key={t.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t.gistId}</td>
                <td style={{ padding: '8px 12px' }}>{t.title}</td>
                <td style={{ padding: '8px 12px' }}>{t.xlmAmount}</td>
                <td style={{ padding: '8px 12px' }}>{formatCurrency(convertXlm(t.xlmAmount, currency), currency)}</td>
                <td style={{ padding: '8px 12px' }}>{t.location}</td>
                <td style={{ padding: '8px 12px' }}>{t.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
