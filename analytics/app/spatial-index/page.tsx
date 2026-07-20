'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const INDEX_TABLES = [
  { name: 'idx_gist_locations_geo',   table: 'gist_locations',     type: 'GIST',  size: '4.2 MB',  usagePct: 94.2, scans: 45200, bloat: '2.1%',  lastReindex: '2026-06-20', recommend: false },
  { name: 'idx_wallet_proximity_geo', table: 'wallet_proximity',   type: 'GIST',  size: '2.8 MB',  usagePct: 91.8, scans: 28100, bloat: '1.8%',  lastReindex: '2026-06-19', recommend: false },
  { name: 'idx_region_polygon',       table: 'region_clusters',    type: 'SP-GIST', size: '1.6 MB', usagePct: 97.5, scans: 12500, bloat: '0.9%',  lastReindex: '2026-06-22', recommend: false },
  { name: 'idx_spatial_gin',          table: 'spatial_index',      type: 'GIN',   size: '6.8 MB',  usagePct: 72.4, scans: 8900,  bloat: '3.5%',  lastReindex: '2026-06-15', recommend: true  },
  { name: 'idx_geo_tip_aggregate',    table: 'geo_tip_aggregates', type: 'BTREE', size: '1.2 MB',  usagePct: 88.6, scans: 9800,  bloat: '0.4%',  lastReindex: '2026-06-25', recommend: false },
];

const QUERY_PLANS = [
  { query: 'Nearest gists (10km)',        planType: 'Index Scan',  idxName: 'idx_gist_locations_geo',   cost: 42.5, rows: 18, actualMs: 38 },
  { query: 'Gists by region',             planType: 'Index Scan',  idxName: 'idx_region_polygon',       cost: 28.2, rows: 45, actualMs: 24 },
  { query: 'Wallet distance',             planType: 'Bitmap Scan', idxName: 'idx_wallet_proximity_geo',  cost: 58.7, rows: 12, actualMs: 52 },
  { query: 'Cluster density',             planType: 'Seq Scan',    idxName: 'N/A (missing)',            cost: 210.0, rows: 480, actualMs: 195 },
  { query: 'Geo-tip aggregation',         planType: 'Index Scan',  idxName: 'idx_geo_tip_aggregate',    cost: 35.1, rows: 28, actualMs: 31 },
];

const PERF_HISTORY_LABELS = ['Jun 1', 'Jun 5', 'Jun 9', 'Jun 13', 'Jun 17', 'Jun 21', 'Jun 25'];
const AVG_QUERY_MS = [58, 62, 55, 68, 72, 60, 52];
const INDEX_HIT_RATE = [91, 90, 92, 88, 86, 89, 93];

export default function SpatialIndexPage() {
  const usageData = {
    labels: INDEX_TABLES.map((i) => i.name),
    datasets: [{
      label: 'Usage %',
      data: INDEX_TABLES.map((i) => i.usagePct),
      backgroundColor: INDEX_TABLES.map((i) => i.usagePct > 90 ? 'rgba(34,197,94,0.7)' : i.usagePct > 80 ? 'rgba(251,191,36,0.7)' : 'rgba(239,68,68,0.7)'),
      borderRadius: 4,
    }],
  };

  const bloatData = {
    labels: INDEX_TABLES.map((i) => i.name),
    datasets: [{
      label: 'Bloat %',
      data: INDEX_TABLES.map((i) => parseFloat(i.bloat)),
      backgroundColor: 'rgba(245,158,11,0.7)',
      borderRadius: 4,
    }],
  };

  const perfTrendData = {
    labels: PERF_HISTORY_LABELS,
    datasets: [
      {
        label: 'Avg Query Time (ms)',
        data: AVG_QUERY_MS,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Index Hit Rate (%)',
        data: INDEX_HIT_RATE,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Spatial Index Efficiency</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          PostGIS index usage, query plan analysis, bloat tracking, and reindex recommendations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Indices',  value: INDEX_TABLES.length.toString() },
          { label: 'Avg Usage',      value: `${Math.round(INDEX_TABLES.reduce((s, i) => s + i.usagePct, 0) / INDEX_TABLES.length)}%` },
          { label: 'Avg Bloat',      value: `${(INDEX_TABLES.reduce((s, i) => s + parseFloat(i.bloat), 0) / INDEX_TABLES.length).toFixed(1)}%` },
          { label: 'Needs Reindex',  value: INDEX_TABLES.filter((i) => i.recommend).length.toString() },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Index Usage Rate</h3>
          <Bar data={usageData} options={{
            responsive: true,
            indexAxis: 'y' as const,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: 'Usage %' } } },
          }} height={140} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Index Bloat %</h3>
          <Bar data={bloatData} options={{
            responsive: true,
            indexAxis: 'y' as const,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, title: { display: true, text: 'Bloat %' } } },
          }} height={140} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Performance Trend</h3>
        <Line data={perfTrendData} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'ms' } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, max: 100, title: { display: true, text: '%' } },
          },
        }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Index Details</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Index</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Table</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Type</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Usage</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Scans</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Bloat</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Reindex</th>
              </tr>
            </thead>
            <tbody>
              {INDEX_TABLES.map((idx) => (
                <tr key={idx.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 600 }}>{idx.name}</td>
                  <td style={{ padding: '10px' }}>{idx.table}</td>
                  <td style={{ padding: '10px', color: '#6b7280' }}>{idx.type}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: idx.usagePct > 90 ? '#22c55e' : idx.usagePct > 80 ? '#b45309' : '#ef4444' }}>{idx.usagePct}%</td>
                  <td style={{ padding: '10px' }}>{idx.scans.toLocaleString()}</td>
                  <td style={{ padding: '10px', color: parseFloat(idx.bloat) > 3 ? '#ef4444' : '#6b7280' }}>{idx.bloat}</td>
                  <td style={{ padding: '10px' }}>
                    {idx.recommend ? (
                      <span style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Recommended</span>
                    ) : (
                      <span style={{ color: '#22c55e', fontSize: 12 }}>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Query Plan Analysis</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Query</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Plan Type</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Index</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Est. Cost</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Actual (ms)</th>
              </tr>
            </thead>
            <tbody>
              {QUERY_PLANS.map((q) => (
                <tr key={q.query} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{q.query}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      background: q.planType === 'Seq Scan' ? '#fef2f2' : '#f0fdf4',
                      color: q.planType === 'Seq Scan' ? '#ef4444' : '#22c55e',
                      borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      {q.planType}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: q.idxName.includes('missing') ? '#ef4444' : undefined }}>
                    {q.idxName}
                  </td>
                  <td style={{ padding: '10px' }}>{q.cost}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{q.actualMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
