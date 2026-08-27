'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const DAILY_SPEND = [42.30, 38.15, 51.80, 44.60, 39.90, 55.20, 48.70];
const DAILY_BUDGET = [50, 50, 50, 50, 50, 50, 50];

const MONTHLY_ACTUAL = [1280, 1350, 1420, 1310, 1180, 1090];
const MONTHLY_BUDGET = [1400, 1400, 1500, 1500, 1400, 1300];

const SAVINGS_DATA = [
  { month: 'Jan', withoutOpt: 1520, withOpt: 1280, saved: 240 },
  { month: 'Feb', withoutOpt: 1610, withOpt: 1350, saved: 260 },
  { month: 'Mar', withoutOpt: 1720, withOpt: 1420, saved: 300 },
  { month: 'Apr', withoutOpt: 1580, withOpt: 1310, saved: 270 },
  { month: 'May', withoutOpt: 1400, withOpt: 1180, saved: 220 },
  { month: 'Jun', withoutOpt: 1290, withOpt: 1090, saved: 200 },
];

const OPERATION_FEES = [
  { operation: 'Create Gist', count: 4820, avgFee: 0.0012, total: 5.78 },
  { operation: 'Update Gist', count: 2140, avgFee: 0.0008, total: 1.71 },
  { operation: 'Comment', count: 8930, avgFee: 0.0005, total: 4.47 },
  { operation: 'Tip', count: 1260, avgFee: 0.0025, total: 3.15 },
  { operation: 'Delete Gist', count: 340, avgFee: 0.0006, total: 0.20 },
  { operation: 'Pin Location', count: 3200, avgFee: 0.0018, total: 5.76 },
  { operation: 'Report', count: 180, avgFee: 0.0004, total: 0.07 },
];

const FORECAST_DAYS = Array.from({ length: 14 }, (_, i) => {
  const base = 42 + Math.sin(i / 3) * 8;
  return Math.round((base + Math.random() * 4) * 100) / 100;
});

const dailySpendData = {
  labels: DAYS,
  datasets: [
    {
      label: 'Actual Spend ($)',
      data: DAILY_SPEND,
      backgroundColor: DAILY_SPEND.map(v => v > 50 ? 'rgba(239,68,68,0.7)' : 'rgba(99,102,241,0.7)'),
      borderRadius: 6,
    },
    {
      label: 'Budget Limit ($)',
      data: DAILY_BUDGET,
      type: 'line' as const,
      borderColor: 'rgba(239,68,68,0.8)',
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ],
};

const budgetVsActualData = {
  labels: MONTHS,
  datasets: [
    {
      label: 'Budget ($)',
      data: MONTHLY_BUDGET,
      backgroundColor: 'rgba(148,163,184,0.4)',
      borderRadius: 6,
    },
    {
      label: 'Actual ($)',
      data: MONTHLY_ACTUAL,
      backgroundColor: 'rgba(99,102,241,0.7)',
      borderRadius: 6,
    },
  ],
};

const savingsData = {
  labels: SAVINGS_DATA.map(s => s.month),
  datasets: [
    {
      label: 'Without Optimization ($)',
      data: SAVINGS_DATA.map(s => s.withoutOpt),
      backgroundColor: 'rgba(239,68,68,0.6)',
      borderRadius: 6,
    },
    {
      label: 'With Optimization ($)',
      data: SAVINGS_DATA.map(s => s.withOpt),
      backgroundColor: 'rgba(34,197,94,0.6)',
      borderRadius: 6,
    },
  ],
};

const forecastData = {
  labels: Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`),
  datasets: [
    {
      label: 'Forecasted Spend ($)',
      data: FORECAST_DAYS,
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
    },
    {
      label: 'Daily Budget ($)',
      data: Array(14).fill(50),
      borderColor: 'rgba(239,68,68,0.8)',
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    },
  ],
};

const currentSpend = DAILY_SPEND.reduce((a, b) => a + b, 0);
const avgDaily = (currentSpend / 7).toFixed(2);
const totalSaved = SAVINGS_DATA.reduce((a, s) => a + s.saved, 0);
const forecastedMonthly = Math.round(avgDaily as unknown as number * 30);

export default function FeeBudgetPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Budget Tracker</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Transaction Fee Budget</h1>
        <p style={{ margin: 0, color: '#475569' }}>Track daily fee spending, budget utilization, optimization savings, and forecast future costs.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Weekly Spend', value: `$${currentSpend.toFixed(2)}` },
          { label: 'Avg Daily Spend', value: `$${avgDaily}` },
          { label: 'Total Saved', value: `$${totalSaved}` },
          { label: 'Forecasted Monthly', value: `$${forecastedMonthly}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Daily Fee Spend</h2>
          <Bar data={dailySpendData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Budget vs Actual (Monthly)</h2>
          <Bar data={budgetVsActualData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Fee Savings from Optimization</h2>
          <Bar data={savingsData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>14-Day Fee Forecast</h2>
          <Line data={forecastData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: false } } }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Per-Operation Fee Breakdown</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Operation', 'Count', 'Avg Fee (XLM)', 'Total (XLM)'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OPERATION_FEES.map((op, i) => (
                <tr key={op.operation} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{op.operation}</td>
                  <td style={{ padding: '10px 12px' }}>{op.count.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{op.avgFee.toFixed(4)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#ede9fe', color: '#6366f1', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{op.total.toFixed(4)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                <td style={{ padding: '10px 12px' }}>Total</td>
                <td style={{ padding: '10px 12px' }}>{OPERATION_FEES.reduce((a, o) => a + o.count, 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>—</td>
                <td style={{ padding: '10px 12px' }}>{OPERATION_FEES.reduce((a, o) => a + o.total, 0).toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}
