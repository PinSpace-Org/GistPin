'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

// ── Mock data ──────────────────────────────────────────────────────────────────

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-05-27');
  d.setDate(d.getDate() - (29 - i));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

const successRate = days.map((_, i) =>
  parseFloat((96 + Math.sin(i * 0.3) * 2.5 + (Math.random() - 0.5)).toFixed(1)));
const failureRate = successRate.map((v) => parseFloat((100 - v).toFixed(1)));

const pinDuration = days.map(() => Math.round(1200 + (Math.random() - 0.5) * 400)); // ms
const gatewayP50  = days.map(() => Math.round(180  + (Math.random() - 0.5) * 60));
const gatewayP95  = days.map(() => Math.round(520  + (Math.random() - 0.5) * 120));
const dlqSize     = days.map((_, i) => Math.max(0, Math.round(3 + Math.sin(i * 0.5) * 3)));
const retryRate   = days.map(() => parseFloat((2.5 + (Math.random() - 0.5) * 1.5).toFixed(1)));

const avgSuccess   = (successRate.reduce((a, b) => a + b, 0) / successRate.length).toFixed(1);
const avgDuration  = Math.round(pinDuration.reduce((a, b) => a + b, 0) / pinDuration.length);
const avgGw        = Math.round(gatewayP50.reduce((a, b) => a + b, 0) / gatewayP50.length);
const currentDlq   = dlqSize[dlqSize.length - 1];
const avgRetry     = (retryRate.reduce((a, b) => a + b, 0) / retryRate.length).toFixed(1);

// ── Chart configs ──────────────────────────────────────────────────────────────

const baseOpts = {
  responsive: true,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'top' as const, labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
    tooltip: { backgroundColor: 'rgba(17,24,39,0.9)', titleColor: '#f9fafb', bodyColor: '#d1d5db', padding: 12, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 8, font: { size: 11 } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } }, border: { display: false } },
  },
};

const successData = {
  labels: days,
  datasets: [
    { label: 'Success %', data: successRate, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
    { label: 'Failure %', data: failureRate, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
  ],
};

const durationData = {
  labels: days,
  datasets: [{ label: 'Avg Pin Duration (ms)', data: pinDuration, backgroundColor: 'rgba(99,102,241,0.75)', borderRadius: 4 }],
};

const gatewayData = {
  labels: days,
  datasets: [
    { label: 'p50 (ms)', data: gatewayP50, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: false, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
    { label: 'p95 (ms)', data: gatewayP95, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: false, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
  ],
};

const dlqData = {
  labels: days,
  datasets: [{ label: 'DLQ Size', data: dlqSize, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 }],
};

const retryData = {
  labels: days,
  datasets: [{ label: 'Retry Rate (%)', data: retryRate, borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 }],
};

const pctOpts = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, min: 0, max: 100, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}%` } } } };
const msOpts  = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}ms` } } } };
const pctSmallOpts = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}%` } } } };

// Tooltip pct suffix
const withPctTooltip = (opts: typeof baseOpts) => ({
  ...opts,
  plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (i: TooltipItem<'line'>) => `  ${i.dataset.label}: ${i.raw}%` } } },
});

const card = { background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' };

export default function IpfsMetricsPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800, color: '#111827' }}>IPFS Pin Metrics</h1>
        <p style={{ margin: 0, color: '#475569' }}>Track IPFS pinning success rates, gateway performance, and retry queues.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Avg Success Rate', value: `${avgSuccess}%`,     color: '#16a34a' },
          { label: 'Avg Pin Duration', value: `${avgDuration}ms`,   color: '#6366f1' },
          { label: 'Gateway p50',      value: `${avgGw}ms`,         color: '#6366f1' },
          { label: 'DLQ Size (now)',   value: currentDlq.toString(), color: currentDlq > 5 ? '#dc2626' : '#16a34a' },
          { label: 'Avg Retry Rate',   value: `${avgRetry}%`,       color: '#ec4899' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Success vs Failure rate */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Success vs Failure Rate — Last 30 Days</h2>
        <Line data={successData} options={withPctTooltip(pctOpts) as Parameters<typeof Line>[0]['options']} />
      </div>

      {/* Avg pin duration */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Average Pin Duration</h2>
        <Bar data={durationData} options={msOpts as Parameters<typeof Bar>[0]['options']} />
      </div>

      {/* Gateway response times */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Gateway Response Times</h2>
        <Line data={gatewayData} options={msOpts as Parameters<typeof Line>[0]['options']} />
      </div>

      {/* DLQ + Retry side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Dead Letter Queue Size</h2>
          <Bar data={dlqData} options={baseOpts as Parameters<typeof Bar>[0]['options']} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Retry Rate</h2>
          <Line data={retryData} options={pctSmallOpts as Parameters<typeof Line>[0]['options']} />
        </div>
      </div>
    </main>
  );
}
