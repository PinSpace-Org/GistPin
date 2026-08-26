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
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const CARD = { background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' } as const;
const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 } as const;

const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date('2026-08-26');
  d.setDate(d.getDate() - (13 - i));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

const DAILY_SPEND = [4.12, 3.87, 4.45, 5.02, 4.78, 3.94, 2.81, 3.56, 4.23, 4.67, 5.11, 4.39, 3.78, 4.05];
const BUDGET_LINE = Array(14).fill(4.50);

const BUDGET_ACTUAL = {
  labels: ['Q1 Actual', 'Q1 Budget', 'Q2 Actual', 'Q2 Budget', 'Q3 Actual', 'Q3 Budget'],
  actual: [382.40, 360.00, 410.20, 390.00, 287.50, 330.00],
  budget: [360.00, 360.00, 390.00, 390.00, 330.00, 330.00],
};

const OPTIMIZATION_SAVINGS = [
  { month: 'Jun', before: 420, after: 382, saved: 38 },
  { month: 'Jul', before: 445, after: 410, saved: 35 },
  { month: 'Aug', before: 310, after: 288, saved: 22 },
];

const OPERATIONS = [
  { name: 'Tip Transaction', count: 18420, avgFee: 0.018, total: 331.56, pctOfTotal: 46.2 },
  { name: 'Pin Creation', count: 8940, avgFee: 0.012, total: 107.28, pctOfTotal: 15.0 },
  { name: 'Gist Publish', count: 12350, avgFee: 0.015, total: 185.25, pctOfTotal: 25.8 },
  { name: 'Content Update', count: 5680, avgFee: 0.008, total: 45.44, pctOfTotal: 6.3 },
  { name: 'IPFS Pin', count: 3210, avgFee: 0.014, total: 44.94, pctOfTotal: 6.3 },
  { name: 'Search Query', count: 42100, avgFee: 0.001, total: 42.10, pctOfTotal: 0.4 },
];

const FORECAST_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date('2026-08-26');
  d.setDate(d.getDate() + i + 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

const FORECAST_ACTUAL = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 4.05];
const FORECAST预测 = Array(14).fill(null).concat([3.92, 4.15, 4.08, 4.22, 3.87, 4.31, 4.18]);
const FORECAST_UPPER = Array(14).fill(null).concat([4.45, 4.72, 4.63, 4.80, 4.38, 4.90, 4.75]);
const FORECAST_LOWER = Array(14).fill(null).concat([3.39, 3.58, 3.53, 3.64, 3.36, 3.72, 3.61]);

const totalSpend = DAILY_SPEND.reduce((a, b) => a + b, 0);
const avgDaily = totalSpend / DAILY_SPEND.length;
const budgetRemaining = 4.50 * 14 - totalSpend;
const totalSaved = OPTIMIZATION_SAVINGS.reduce((s, o) => s + o.saved, 0);

export default function FeeBudgetPage() {
  const dailyData = {
    labels: DAYS,
    datasets: [
      {
        label: 'Daily Fee Spend (XLM)',
        data: DAILY_SPEND,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
      },
      {
        label: 'Daily Budget (XLM)',
        data: BUDGET_LINE,
        borderColor: '#f59e0b',
        borderDash: [8, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const budgetActualData = {
    labels: BUDGET_ACTUAL.labels,
    datasets: [
      {
        label: 'Amount (XLM)',
        data: BUDGET_ACTUAL.actual,
        backgroundColor: BUDGET_ACTUAL.actual.map((v, i) => (i % 2 === 0 ? 'rgba(99,102,241,0.75)' : 'rgba(245,158,11,0.75)')),
        borderRadius: 6,
      },
    ],
  };

  const savingsData = {
    labels: OPTIMIZATION_SAVINGS.map((s) => s.month),
    datasets: [
      {
        label: 'Before Optimization',
        data: OPTIMIZATION_SAVINGS.map((s) => s.before),
        backgroundColor: 'rgba(239,68,68,0.6)',
        borderRadius: 4,
      },
      {
        label: 'After Optimization',
        data: OPTIMIZATION_SAVINGS.map((s) => s.after),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 4,
      },
    ],
  };

  const forecastLabels = [...DAYS, ...FORECAST_DAYS];
  const forecastData = {
    labels: forecastLabels,
    datasets: [
      {
        label: 'Actual Spend',
        data: FORECAST_ACTUAL,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2.5,
      },
      {
        label: 'Forecast',
        data: FORECAST预测,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
        borderDash: [6, 3],
      },
      {
        label: 'Upper Bound',
        data: FORECAST_UPPER,
        borderColor: 'rgba(16,185,129,0.3)',
        backgroundColor: 'rgba(16,185,129,0.06)',
        fill: '+1',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1,
      },
      {
        label: 'Lower Bound',
        data: FORECAST_LOWER,
        borderColor: 'rgba(16,185,129,0.3)',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)', borderRadius: 22, padding: 32, marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, color: '#111827' }}>Transaction Fee Budget Tracker</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Monitor daily fee spend against budget, track optimization savings, and forecast future costs.</p>
      </div>

      <div style={GRID_STYLE} data-report-section data-report-title="Fee KPIs">
        {[
          { label: 'Total Spend (14d)', value: `${totalSpend.toFixed(2)} XLM`, color: '#6366f1' },
          { label: 'Avg Daily Spend', value: `${avgDaily.toFixed(2)} XLM`, color: '#111827' },
          { label: 'Budget Remaining', value: `${budgetRemaining.toFixed(2)} XLM`, color: budgetRemaining > 0 ? '#16a34a' : '#ef4444' },
          { label: 'Total Saved', value: `${totalSaved.toFixed(0)} XLM`, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...CARD, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 28 }} data-report-section data-report-title="Daily Spend & Budget vs Actual">
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Daily Fee Spend</h3>
          <Line data={dailyData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 7 } },
              y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v} XLM` } },
            },
          }} height={90} />
        </div>
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Budget vs Actual by Quarter</h3>
          <Bar data={budgetActualData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v} XLM` } } },
          }} height={90} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }} data-report-section data-report-title="Optimization & Per-Operation Breakdown">
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Fee Savings from Optimization</h3>
          <Bar data={savingsData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v} XLM` } } },
          }} height={90} />
        </div>
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Per-Operation Fee Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Operation</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Count</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Avg Fee</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Total</th>
              </tr>
            </thead>
            <tbody>
              {OPERATIONS.map((op) => (
                <tr key={op.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600 }}>{op.name}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>{op.count.toLocaleString()}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>{op.avgFee.toFixed(3)} XLM</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>{op.total.toFixed(2)} XLM</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <div style={{ width: 50, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${op.pctOfTotal}%`, height: '100%', background: op.pctOfTotal > 20 ? '#6366f1' : '#94a3b8', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b', minWidth: 32, textAlign: 'right' }}>{op.pctOfTotal}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }} data-report-section data-report-title="Fee Forecast">
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>7-Day Fee Forecast</h3>
          <Line data={forecastData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 10 } },
              y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v} XLM` } },
            },
          }} height={100} />
        </div>
      </div>
    </main>
  );
}
