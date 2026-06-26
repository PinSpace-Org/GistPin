'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const GEO_TABLES = [
  { name: 'gist_locations',     rows: 45200, size: '12.4 MB',  indices: 3, lastVacuum: '2026-06-24', bloat: '2.1%' },
  { name: 'wallet_proximity',   rows: 28100, size: '8.2 MB',   indices: 2, lastVacuum: '2026-06-23', bloat: '1.8%' },
  { name: 'region_clusters',    rows: 12500, size: '4.1 MB',   indices: 3, lastVacuum: '2026-06-22', bloat: '0.9%' },
  { name: 'spatial_index',      rows: 0,     size: '18.6 MB',  indices: 1, lastVacuum: '2026-06-20', bloat: '3.5%' },
  { name: 'geo_tip_aggregates', rows: 9800,  size: '2.8 MB',   indices: 2, lastVacuum: '2026-06-25', bloat: '0.4%' },
];

const QUERY_PERF = [
  { query: 'Nearest gists (10km)',      avgMs: 42,  p99Ms: 185, calls: 12800 },
  { query: 'Gists by region',           avgMs: 28,  p99Ms: 120, calls: 9500 },
  { query: 'Wallet distance',           avgMs: 65,  p99Ms: 310, calls: 4200 },
  { query: 'Cluster density',           avgMs: 120, p99Ms: 480, calls: 1800 },
  { query: 'Geo-tip aggregation',       avgMs: 55,  p99Ms: 220, calls: 3200 },
];

const INDEX_USAGE = [
  { index: 'idx_gist_locations_geo',     scans: 45200,  hitRate: 98.2 },
  { index: 'idx_wallet_proximity_geo',   scans: 28100,  hitRate: 96.5 },
  { index: 'idx_region_polygon',         scans: 12500,  hitRate: 99.1 },
  { index: 'idx_spatial_gin',            scans: 8900,   hitRate: 87.3 },
];

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
const GEO_QUERY_TREND = [1200, 1450, 1680, 1920, 2100, 2450];

export default function PostgisMetricsPage() {
  const queryBar = {
    labels: QUERY_PERF.map((q) => q.query),
    datasets: [
      {
        label: 'Avg (ms)',
        data: QUERY_PERF.map((q) => q.avgMs),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 3,
      },
      {
        label: 'P99 (ms)',
        data: QUERY_PERF.map((q) => q.p99Ms),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 3,
      },
    ],
  };

  const hitRateData = {
    labels: INDEX_USAGE.map((i) => i.index),
    datasets: [{
      label: 'Cache Hit Rate (%)',
      data: INDEX_USAGE.map((i) => i.hitRate),
      backgroundColor: INDEX_USAGE.map((i) => i.hitRate > 95 ? 'rgba(34,197,94,0.7)' : 'rgba(251,191,36,0.7)'),
      borderRadius: 3,
    }],
  };

  const trendData = {
    labels: WEEKS,
    datasets: [{
      label: 'Geo Queries',
      data: GEO_QUERY_TREND,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>PostGIS Metrics</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Spatial database health, query performance, and index usage.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Tables',    value: '5' },
          { label: 'Total Rows',      value: '95.6K' },
          { label: 'Total Size',      value: '46.1 MB' },
          { label: 'Avg Hit Rate',    value: '95.3%' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Geo-Spatial Tables</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Table</th>
                <th style={{ padding: '6px 10px' }}>Rows</th>
                <th style={{ padding: '6px 10px' }}>Size</th>
                <th style={{ padding: '6px 10px' }}>Indices</th>
                <th style={{ padding: '6px 10px' }}>Bloat</th>
              </tr>
            </thead>
            <tbody>
              {GEO_TABLES.map((t) => (
                <tr key={t.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{t.name}</td>
                  <td style={{ padding: '6px 10px' }}>{t.rows.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px' }}>{t.size}</td>
                  <td style={{ padding: '6px 10px' }}>{t.indices}</td>
                  <td style={{ padding: '6px 10px' }}>{t.bloat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Query Performance</h3>
          <Bar data={queryBar} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } } } }} height={80} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Index Cache Hit Rate</h3>
          <Bar data={hitRateData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } } } }} height={80} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Geo Query Trend (Weekly)</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>
    </main>
  );
}
