'use client';

import { useState } from 'react';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';

import {
  getErrorTaxonomy,
  getErrorTrends,
  getResolutionTimes,
  getErrorSummary,
} from '@/lib/error-categorizer';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const card = { background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' };

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

function TaxonomyNode({ node, depth = 0 }: { node: ReturnType<typeof getErrorTaxonomy>; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const barWidth = Math.round((node.count / 24891) * 100);

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: hasChildren ? 'pointer' : 'default', background: depth === 0 ? '#f8fafc' : 'transparent', marginBottom: 4, transition: 'background 0.15s' }}
      >
        {hasChildren && (
          <span style={{ width: 18, height: 18, borderRadius: 4, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#475569', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ›
          </span>
        )}
        {!hasChildren && <span style={{ width: 18 }} />}
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#6366f1', minWidth: 40 }}>{node.code}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>{node.name}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{node.count.toLocaleString()}</span>
        <div style={{ width: 80, height: 6, borderRadius: 999, background: '#e2e8f0' }}>
          <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 999, background: node.code.startsWith('5') ? '#ef4444' : node.code.startsWith('4') ? '#f59e0b' : '#6366f1' }} />
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 40, textAlign: 'right' }}>{node.percentage}%</span>
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <TaxonomyNode key={child.code} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ErrorTaxonomyPage() {
  const taxonomy = getErrorTaxonomy();
  const trends = getErrorTrends();
  const resolutions = getResolutionTimes();
  const summary = getErrorSummary();

  const volumeData = {
    labels: trends.map((t) => t.date),
    datasets: [
      { label: 'Client (4xx)', data: trends.map((t) => t.clientErrors), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
      { label: 'Server (5xx)', data: trends.map((t) => t.serverErrors), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
      { label: 'Auth', data: trends.map((t) => t.authErrors), backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 4 },
      { label: 'Rate Limit', data: trends.map((t) => t.rateLimitErrors), backgroundColor: 'rgba(236,72,153,0.7)', borderRadius: 4 },
    ],
  };

  const trendLineData = {
    labels: trends.map((t) => t.date),
    datasets: [
      { label: 'Client Errors', data: trends.map((t) => t.clientErrors), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
      { label: 'Server Errors', data: trends.map((t) => t.serverErrors), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 },
    ],
  };

  const doughnutData = {
    labels: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '429 Rate Limited', '500 Internal', '502 Bad Gateway', '503 Unavailable', '504 Timeout'],
    datasets: [{
      data: [4821, 3892, 2104, 3217, 2200, 2340, 1180, 1212, 900],
      backgroundColor: ['#f59e0b', '#eab308', '#d97706', '#fbbf24', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
      borderWidth: 0,
    }],
  };

  const resolutionData = {
    labels: resolutions.map((r) => r.errorType),
    datasets: [
      { label: 'P50', data: resolutions.map((r) => r.p50), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
      { label: 'P95', data: resolutions.map((r) => r.p95), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
      { label: 'P99', data: resolutions.map((r) => r.p99), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
    ],
  };

  const clientCauses = taxonomy.children?.[0]?.children?.flatMap((c) => c.causes.map((cause) => ({ error: c.name, cause }))) ?? [];
  const serverCauses = taxonomy.children?.[1]?.children?.flatMap((c) => c.causes.map((cause) => ({ error: c.name, cause }))) ?? [];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#fee2e2 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>API Health</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800, color: '#111827' }}>API Error Taxonomy Dashboard</h1>
        <p style={{ margin: 0, color: '#475569' }}>Classify, analyze, and track API errors with hierarchical taxonomy and resolution insights.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Errors (30d)', value: summary.totalErrors.toLocaleString(), color: '#ef4444' },
          { label: 'Top Error Type', value: summary.topError, color: '#f59e0b' },
          { label: 'Avg Resolution', value: `${(summary.avgResolution / 1000).toFixed(1)}s`, color: '#8b5cf6' },
          { label: 'Error Rate', value: `${summary.errorRate}%`, color: '#ec4899' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Taxonomy tree + Doughnut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ ...card, padding: '20px' }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700 }}>Error Taxonomy Tree</h2>
          <TaxonomyNode node={taxonomy} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Error Distribution</h2>
          <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'right', labels: { padding: 10, font: { size: 11 } } } } }} />
        </div>
      </div>

      {/* Volume by type - stacked bar */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Error Volume by Type (Last 30 Days)</h2>
        <Bar data={volumeData} options={{ ...baseOpts, plugins: { ...baseOpts.plugins, legend: { ...baseOpts.plugins.legend, position: 'bottom' } }, scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, stacked: true }, y: { ...baseOpts.scales.y, stacked: true } } } as Parameters<typeof Bar>[0]['options']} />
      </div>

      {/* Trend comparison line */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Error Trend Comparison</h2>
        <Line data={trendLineData} options={baseOpts as Parameters<typeof Line>[0]['options']} />
      </div>

      {/* Resolution time tracking */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Resolution Time by Error Type</h2>
        <Bar data={resolutionData} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}ms` } } } } as Parameters<typeof Bar>[0]['options']} />
      </div>

      {/* Cause analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Client Error Causes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientCauses.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#fef3c7' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', minWidth: 80 }}>{item.error}</span>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.cause}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Server Error Causes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {serverCauses.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#fee2e2' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', minWidth: 80 }}>{item.error}</span>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.cause}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
