'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { getExpansionMonths, getGeoConcentrations, getUrbanRuralBreakdown, getGrowthFrontier } from '@/lib/geo-expansion';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const months = getExpansionMonths();

export default function ExpansionMap() {
  const cumChart = {
    labels: months.map((m) => m.month),
    datasets: [
      {
        label: 'New Locations',
        data: months.map((m) => m.newLocations),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 1,
        borderRadius: 3,
      },
      {
        label: 'Cumulative',
        data: months.map((m) => m.cumulativeLocations),
        borderColor: 'rgba(34,197,94,1)',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const cumOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'New / month' } },
      y1: { beginAtZero: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Cumulative' } },
    },
  };

  const concData = {
    labels: getGeoConcentrations().map((c) => c.region),
    datasets: [{
      data: getGeoConcentrations().map((c) => c.pct),
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(34,197,94,0.8)', 'rgba(251,191,36,0.8)', 'rgba(239,68,68,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)'],
      borderWidth: 0,
    }],
  };

  const ur = getUrbanRuralBreakdown();
  const urData = {
    labels: ['Urban', 'Suburban', 'Rural'],
    datasets: [{
      data: [ur.urban, ur.suburban, ur.rural],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(251,191,36,0.8)', 'rgba(34,197,94,0.8)'],
      borderWidth: 0,
    }],
  };

  const frontier = getGrowthFrontier();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Monthly Expansion</h3>
        <Bar data={cumChart} options={cumOptions} height={80} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Geographic Concentration</h3>
          <Pie data={concData} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Urban vs Rural</h3>
          <Pie data={urData} />
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Growth Frontier</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {frontier.map((loc) => (
            <span
              key={loc}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {loc}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Location Launch Timeline</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Month</th>
              <th style={{ padding: '8px 12px' }}>New Locations</th>
              <th style={{ padding: '8px 12px' }}>Locations</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.month}</td>
                <td style={{ padding: '8px 12px' }}>{m.newLocations}</td>
                <td style={{ padding: '8px 12px' }}>{m.locations.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
