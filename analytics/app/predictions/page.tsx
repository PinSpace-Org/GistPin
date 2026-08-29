'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { generatePredictiveSuiteData } from '@/lib/predictive-analytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function PredictionsPage() {
  const suite = generatePredictiveSuiteData();

  const densityData = {
    labels: suite.density.map((d) => d.cell),
    datasets: [
      {
        label: 'Value score',
        data: suite.density.map((d) => d.valueScore),
        backgroundColor: suite.density.map((d) => (d.highValue ? 'rgba(34,197,94,0.75)' : 'rgba(99,102,241,0.55)')),
        borderRadius: 4,
      },
    ],
  };

  const uptimeData = {
    labels: suite.uptime.map((u) => u.label),
    datasets: [
      {
        label: 'Measured availability',
        data: suite.uptime.map((u) => u.availability),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Forecast',
        data: suite.uptime.map((u) => u.forecast),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        fill: true,
        tension: 0.3,
        borderDash: [6, 4],
        spanGaps: true,
      },
    ],
  };

  const impactData = {
    labels: suite.deprecations.map((d) => d.endpoint),
    datasets: [
      {
        label: 'Impact score',
        data: suite.deprecations.map((d) => d.impactScore),
        backgroundColor: suite.deprecations.map((d) => (d.impactScore >= 70 ? 'rgba(239,68,68,0.7)' : d.impactScore >= 40 ? 'rgba(234,179,8,0.7)' : 'rgba(107,114,128,0.6)')),
        borderRadius: 4,
      },
    ],
  };

  const lastUptime = suite.uptime[suite.uptime.length - 1];
  const avgAvailability = suite.uptime.length
    ? (suite.uptime.reduce((sum, u) => sum + (u.availability ?? 0), 0) / suite.uptime.length).toFixed(2)
    : '—';

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Predictive Analytics Suite</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Value density, deprecation impact, influence propagation and uptime trend forecasting.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Cells Tracked', value: String(suite.density.length) },
          { label: 'Avg Availability', value: `${avgAvailability}%` },
          { label: 'Endpoints at Risk', value: String(suite.deprecations.filter((d) => d.impactScore >= 40).length) },
          { label: 'SLA Breach Probability', value: `${lastUptime ? lastUptime.slaBreachProbability : 0}%` },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Platform Value Density by Cell</h3>
        <Bar data={densityData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={100} />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          Green bars mark high-value zones identified by the density model.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Uptime Trend & Forecast</h3>
        <Line data={uptimeData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false, suggestedMin: 98 } } }} height={80} />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          Solid line = measured, dashed line = forecast. Forecast assumes maintenance windows carry the historical trend forward.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>API Deprecation Impact</h3>
        <Bar data={impactData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={100} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Top Influencer Gists</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Gist</th>
              <th style={{ padding: '8px 12px' }}>Influence Score</th>
              <th style={{ padding: '8px 12px' }}>Radius (km)</th>
              <th style={{ padding: '8px 12px' }}>Cells Reached</th>
            </tr>
          </thead>
          <tbody>
            {suite.influencers.map((row) => (
              <tr key={row.gist} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.gist}</td>
                <td style={{ padding: '8px 12px' }}>{row.influence}</td>
                <td style={{ padding: '8px 12px' }}>{row.radius}</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: '#6b7280' }}>{row.reachedCells || row.gist}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Deprecation Communication Plans</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Endpoint</th>
              <th style={{ padding: '8px 12px' }}>Consumers</th>
              <th style={{ padding: '8px 12px' }}>Usage / day</th>
              <th style={{ padding: '8px 12px' }}>Migration effort</th>
              <th style={{ padding: '8px 12px' }}>Impact</th>
              <th style={{ padding: '8px 12px' }}>Plan recipients</th>
            </tr>
          </thead>
          <tbody>
            {suite.deprecations.map((row) => (
              <tr key={row.endpoint} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.endpoint}</td>
                <td style={{ padding: '8px 12px' }}>{row.consumers}</td>
                <td style={{ padding: '8px 12px' }}>{row.usagePerDay.toLocaleString()}</td>
                <td style={{ padding: '8px 12px' }}>{row.migrationEffort} pd</td>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: row.impactScore >= 70 ? '#dc2626' : row.impactScore >= 40 ? '#b45309' : '#6b7280' }}>{row.impactScore}</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: '#6b7280' }}>{row.planRecipients.length > 0 ? `${row.planRecipients.length} teams` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}