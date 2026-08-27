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
import { Line, Bar, Radar } from 'react-chartjs-2';

import {
  getGatewayComparisonData,
  getGatewayHealthStatus,
  rankGateways,
} from '@/lib/gateway-benchmarks';

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

const GW_COLORS: Record<string, { border: string; bg: string }> = {
  pinata:     { border: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  infura:     { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'dweb-link': { border: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  cloudflare: { border: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  'ipfs-io':  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

export default function GatewayComparisonPage() {
  const data = getGatewayComparisonData();
  const ranked = rankGateways(data);

  const best = data.gateways.find((g) => g.slug === data.bestGateway)!;
  const bestHealth = getGatewayHealthStatus(best);
  const avgP50 = Math.round(data.gateways.reduce((s, g) => s + g.avgLatency, 0) / data.gateways.length);
  const avgUptime = (data.gateways.reduce((s, g) => s + g.uptime, 0) / data.gateways.length).toFixed(2);

  const responseTimeData = {
    labels: data.labels,
    datasets: data.gateways.map((gw) => ({
      label: `${gw.name} P50`,
      data: gw.responseTimeP50,
      borderColor: GW_COLORS[gw.slug]?.border ?? '#6b7280',
      backgroundColor: GW_COLORS[gw.slug]?.bg ?? 'rgba(107,114,128,0.1)',
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const p95Data = {
    labels: data.labels,
    datasets: data.gateways.map((gw) => ({
      label: `${gw.name} P95`,
      data: gw.responseTimeP95,
      borderColor: GW_COLORS[gw.slug]?.border ?? '#6b7280',
      backgroundColor: GW_COLORS[gw.slug]?.bg ?? 'rgba(107,114,128,0.1)',
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderDash: [5, 3],
    })),
  };

  const availabilityData = {
    labels: data.labels,
    datasets: data.gateways.map((gw) => ({
      label: gw.name,
      data: gw.availability,
      borderColor: GW_COLORS[gw.slug]?.border ?? '#6b7280',
      backgroundColor: GW_COLORS[gw.slug]?.bg ?? 'rgba(107,114,128,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const freshnessData = {
    labels: data.labels,
    datasets: data.gateways.map((gw) => ({
      label: gw.name,
      data: gw.freshnessScore,
      borderColor: GW_COLORS[gw.slug]?.border ?? '#6b7280',
      backgroundColor: GW_COLORS[gw.slug]?.bg ?? 'rgba(107,114,128,0.1)',
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    })),
  };

  const radarData = {
    labels: ['Speed', 'Uptime', 'Freshness', 'Reliability', 'Cost'],
    datasets: data.gateways.slice(0, 3).map((gw) => ({
      label: gw.name,
      data: [
        Math.round(100 - gw.avgLatency / 3),
        gw.uptime,
        gw.freshnessScore[29],
        gw.status === 'healthy' ? 95 : gw.status === 'degraded' ? 70 : 30,
        Math.round(60 + Math.random() * 30),
      ],
      borderColor: GW_COLORS[gw.slug]?.border ?? '#6b7280',
      backgroundColor: GW_COLORS[gw.slug]?.bg ?? 'rgba(107,114,128,0.1)',
    })),
  };

  const bestRankScore = data.overallScore[data.bestGateway];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#e0e7ff 100%)', borderRadius: 28, padding: 30, boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>IPFS Gateway</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800, color: '#111827' }}>Gateway Performance Comparison</h1>
        <p style={{ margin: 0, color: '#475569' }}>Compare response times, availability, and content freshness across IPFS gateways.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Best Gateway', value: best.name, color: bestHealth.color },
          { label: 'Best Score', value: `${bestRankScore}/100`, color: '#6366f1' },
          { label: 'Avg P50 Latency', value: `${avgP50}ms`, color: '#f59e0b' },
          { label: 'Avg Uptime', value: `${avgUptime}%`, color: '#16a34a' },
          { label: 'Gateways Tracked', value: data.gateways.length.toString(), color: '#8b5cf6' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gateway health dashboard */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Gateway Health Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {data.gateways.map((gw) => {
            const health = getGatewayHealthStatus(gw);
            const rank = ranked.findIndex((r) => r.slug === gw.slug) + 1;
            return (
              <div key={gw.slug} style={{ padding: 16, borderRadius: 14, border: `1px solid ${health.color}33`, background: `${health.color}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{gw.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: health.color, padding: '3px 8px', borderRadius: 999, background: `${health.color}18` }}>#{rank}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: health.color }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{health.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Uptime: {gw.uptime}% · Latency: {gw.avgLatency}ms</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Response time comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>P50 Response Time by Gateway</h2>
          <Line data={responseTimeData} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}ms` } } } } as Parameters<typeof Line>[0]['options']} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>P95 Response Time by Gateway</h2>
          <Line data={p95Data} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}ms` } } } } as Parameters<typeof Line>[0]['options']} />
        </div>
      </div>

      {/* Availability & Freshness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Availability Rate (%)</h2>
          <Line data={availabilityData} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, min: 95, max: 100, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}%` } } } } as Parameters<typeof Line>[0]['options']} />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Content Freshness Score</h2>
          <Line data={freshnessData} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, min: 70, max: 100, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number | string) => `${v}` } } } } as Parameters<typeof Line>[0]['options']} />
        </div>
      </div>

      {/* Radar + Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Gateway Radar Comparison</h2>
          <Radar data={radarData} options={{ responsive: true, plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } } }, scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.06)' }, angleLines: { color: 'rgba(0,0,0,0.06)' } } } } />
        </div>
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>Best Gateway Selector</h2>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Ranked by composite score (40% uptime, 30% freshness, 30% speed)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ranked.map((r, i) => (
              <div key={r.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: i === 0 ? '2px solid #6366f1' : '1px solid rgba(148,163,184,0.16)', background: i === 0 ? '#f5f3ff' : '#fff' }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, background: i === 0 ? '#6366f1' : '#e2e8f0', color: i === 0 ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                  <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#e2e8f0', marginTop: 6 }}>
                    <div style={{ width: `${r.score}%`, height: '100%', borderRadius: 999, background: i === 0 ? '#6366f1' : '#94a3b8' }} />
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18, color: i === 0 ? '#6366f1' : '#475569' }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
