'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'chart.js';
import { Bar as BarChart, Line as LineChart } from 'react-chartjs-2';
import {
  generateMockSamples,
  computeBaseline,
  detectRegressions,
  compareDeployments,
  computeRadiusPerformance,
} from '@/lib/regression-detector';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const samples = generateMockSamples();
const baselines = computeBaseline(samples);
const regressions = detectRegressions(samples, baselines);
const deployments = compareDeployments(samples);
const radiusPerf = computeRadiusPerformance(samples);

const HEADER_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)',
  borderRadius: 22,
  padding: 24,
  border: '1px solid rgba(148,163,184,0.16)',
  marginBottom: 32,
};

const CARD_STYLE: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 22,
  padding: 24,
  border: '1px solid rgba(148,163,184,0.16)',
};

const KPI_STYLE: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  padding: '18px 22px',
  border: '1px solid rgba(148,163,184,0.16)',
};

const QUERY_TYPES = ['All', ...Array.from(new Set(samples.map((s) => s.queryType)))];
const RADIUS_OPTIONS = ['All', ...Array.from(new Set(samples.map((s) => s.radiusKm))).sort((a, b) => a - b).map(String)];

export default function GeoPerformancePage() {
  const [queryFilter, setQueryFilter] = useState('All');
  const [radiusFilter, setRadiusFilter] = useState('All');

  const filteredSamples = useMemo(() => {
    return samples.filter((s) =>
      (queryFilter === 'All' || s.queryType === queryFilter) &&
      (radiusFilter === 'All' || String(s.radiusKm) === radiusFilter)
    );
  }, [queryFilter, radiusFilter]);

  const radiusData = useMemo(() => computeRadiusPerformance(filteredSamples), [filteredSamples]);
  const filteredBaselines = useMemo(() => computeBaseline(filteredSamples), [filteredSamples]);

  const radiusBarData = {
    labels: radiusData.map((r) => `${r.radiusKm}km`),
    datasets: [
      {
        label: 'Avg (ms)',
        data: radiusData.map((r) => r.avgMs),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 3,
      },
      {
        label: 'P95 (ms)',
        data: radiusData.map((r) => r.p95Ms),
        backgroundColor: 'rgba(239,68,68,0.5)',
        borderRadius: 3,
      },
    ],
  };

  const radiusBarOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false }, title: { display: true, text: 'ms' } },
    },
  };

  const deployBarData = {
    labels: deployments.map((d) => d.version),
    datasets: [
      {
        label: 'Avg Query Time (ms)',
        data: deployments.map((d) => d.avgMs),
        backgroundColor: deployments.map((d) => d.regressionCount > 0 ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'),
        borderRadius: 4,
      },
    ],
  };

  const deployBarOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
    },
  };

  const hourlyTrend = radiusData.length > 0 ? radiusData[0].trend : Array(24).fill(0);
  const trendData = {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    datasets: [{
      label: 'Avg Query Time by Hour',
      data: hourlyTrend,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    }],
  };

  const trendOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
    },
  };

  const totalSamples = filteredSamples.length;
  const avgDuration = filteredSamples.length > 0
    ? (filteredSamples.reduce((s, v) => s + v.durationMs, 0) / filteredSamples.length).toFixed(1)
    : '0';
  const regressionCount = regressions.length;
  const criticalCount = regressions.filter((r) => r.severity === 'critical').length;

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={HEADER_STYLE}>
        <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800, color: '#1e293b' }}>
          Geospatial Query Performance
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 15 }}>
          Regression detection, radius-based tracking, deployment comparison, and baseline management.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Samples', value: totalSamples.toLocaleString(), color: '#1e293b' },
          { label: 'Avg Duration', value: `${avgDuration}ms`, color: '#1e293b' },
          { label: 'Regressions', value: `${regressionCount}`, color: regressionCount > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Critical Alerts', value: `${criticalCount}`, color: criticalCount > 0 ? '#ef4444' : '#22c55e' },
        ].map((kpi) => (
          <div key={kpi.label} style={KPI_STYLE}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Query:</span>
          {QUERY_TYPES.map((qt) => (
            <button
              key={qt}
              type="button"
              onClick={() => setQueryFilter(qt)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                border: queryFilter === qt ? '1px solid #6366f1' : '1px solid rgba(148,163,184,0.25)',
                background: queryFilter === qt ? '#6366f1' : '#fff',
                color: queryFilter === qt ? '#fff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {qt}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Radius:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusFilter(r)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                border: radiusFilter === r ? '1px solid #3b82f6' : '1px solid rgba(148,163,184,0.25)',
                background: radiusFilter === r ? '#3b82f6' : '#fff',
                color: radiusFilter === r ? '#fff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {regressions.length > 0 && (
        <div style={{ ...CARD_STYLE, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#ef4444' }}>
            Regression Alerts ({regressions.length})
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {regressions.map((alert, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: alert.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                  color: '#fff',
                }}>
                  {alert.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>{alert.message}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  +{alert.slowdownPct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Query Time by Radius
          </h3>
          <BarChart data={radiusBarData} options={radiusBarOpts} height={220} />
        </div>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Hourly Performance Trend
          </h3>
          <LineChart data={trendData} options={trendOpts} height={260} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Deployment Comparison
          </h3>
          <BarChart data={deployBarData} options={deployBarOpts} height={200} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
            {deployments.map((d) => (
              <div key={d.version} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 12, background: '#f8fafc' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{d.version}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{d.avgMs}ms avg</div>
                <div style={{ fontSize: 11, color: d.regressionCount > 0 ? '#ef4444' : '#22c55e' }}>
                  {d.regressionCount} regressions
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={CARD_STYLE}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            Performance Baseline by Radius
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(148,163,184,0.2)', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Radius</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Mean</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>P50</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>P95</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>P99</th>
                <th style={{ padding: '6px 10px', color: '#64748b' }}>Samples</th>
              </tr>
            </thead>
            <tbody>
              {radiusPerf.map((r) => (
                <tr key={r.radiusKm} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: '#334155' }}>{r.radiusKm}km</td>
                  <td style={{ padding: '7px 10px', color: '#334155' }}>{r.avgMs}ms</td>
                  <td style={{ padding: '7px 10px', color: '#334155' }}>{r.p50Ms}ms</td>
                  <td style={{ padding: '7px 10px', color: '#f59e0b' }}>{r.p95Ms}ms</td>
                  <td style={{ padding: '7px 10px', color: '#ef4444' }}>{r.p99Ms}ms</td>
                  <td style={{ padding: '7px 10px', color: '#64748b' }}>{r.samples.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
