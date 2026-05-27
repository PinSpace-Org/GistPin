'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const SERVICES = [
  { name: 'API Gateway',    status: 'operational', uptime30: 99.97, uptime90: 99.94 },
  { name: 'Auth Service',   status: 'operational', uptime30: 99.99, uptime90: 99.98 },
  { name: 'Gist Indexer',   status: 'degraded',    uptime30: 98.72, uptime90: 99.41 },
  { name: 'Map Tiles CDN',  status: 'operational', uptime30: 100.0, uptime90: 99.99 },
  { name: 'Soroban Bridge', status: 'incident',    uptime30: 97.85, uptime90: 98.90 },
  { name: 'IPFS Gateway',   status: 'operational', uptime30: 99.88, uptime90: 99.75 },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  operational: { bg: '#dcfce7', color: '#16a34a', label: 'Operational' },
  degraded:    { bg: '#fef9c3', color: '#ca8a04', label: 'Degraded'    },
  incident:    { bg: '#fee2e2', color: '#dc2626', label: 'Incident'    },
};

const INCIDENTS = [
  { date: '2026-05-24', service: 'Soroban Bridge', duration: '42 min', description: 'RPC node timeout causing transaction delays.' },
  { date: '2026-05-18', service: 'Gist Indexer',   duration: '18 min', description: 'Database connection pool exhaustion under peak load.' },
  { date: '2026-05-10', service: 'API Gateway',    duration: '7 min',  description: 'Deployment rollout caused brief 503 responses.' },
];

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-05-27');
  d.setDate(d.getDate() - (29 - i));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

// Simulated response time data (ms)
const responseTime = days.map((_, i) =>
  Math.round(80 + Math.sin(i * 0.4) * 20 + Math.random() * 15)
);

const responseData = {
  labels: days,
  datasets: [{
    label: 'Response Time (ms)',
    data: responseTime,
    borderColor: 'rgba(99,102,241,1)',
    backgroundColor: 'rgba(99,102,241,0.08)',
    tension: 0.4,
    fill: true,
    pointRadius: 0,
    pointHoverRadius: 4,
  }],
};

const lineOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 8 } },
    y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', callback: (v: number | string) => `${v}ms` }, border: { display: false } },
  },
};

const overallUptime30 = (SERVICES.reduce((s, svc) => s + svc.uptime30, 0) / SERVICES.length).toFixed(2);
const overallUptime90 = (SERVICES.reduce((s, svc) => s + svc.uptime90, 0) / SERVICES.length).toFixed(2);
const avgResponse = Math.round(responseTime.reduce((a, b) => a + b, 0) / responseTime.length);
const activeIncidents = SERVICES.filter((s) => s.status === 'incident').length;

export default function UptimePage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Server Uptime & Status</h1>
        <p style={{ margin: 0, color: '#475569' }}>Real-time service health, uptime metrics, and incident history.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Uptime (30 days)',  value: `${overallUptime30}%`, color: '#16a34a' },
          { label: 'Uptime (90 days)',  value: `${overallUptime90}%`, color: '#16a34a' },
          { label: 'Avg Response Time', value: `${avgResponse} ms`,   color: '#6366f1' },
          { label: 'Active Incidents',  value: activeIncidents.toString(), color: activeIncidents > 0 ? '#dc2626' : '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Service status grid */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Service Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {SERVICES.map((svc) => {
            const st = STATUS_STYLE[svc.status];
            return (
              <div key={svc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{svc.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    30d: {svc.uptime30}% &nbsp;|&nbsp; 90d: {svc.uptime90}%
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 12, fontWeight: 700 }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Response time chart */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Response Time — Last 30 Days</h2>
        <Line data={responseData} options={lineOpts} />
      </div>

      {/* Incident timeline */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Incident Timeline</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {INCIDENTS.map((inc) => (
            <div key={inc.date + inc.service} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ minWidth: 90, fontSize: 12, color: '#dc2626', fontWeight: 700, paddingTop: 2 }}>{inc.date}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{inc.service} <span style={{ color: '#94a3b8', fontWeight: 400 }}>— {inc.duration}</span></div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{inc.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
