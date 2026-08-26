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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useState } from 'react';
import {
  MOCK_DISCOVERIES,
  REGION_STATS,
  DISCOVERY_TIMELINE,
  getDiscoveryVelocity,
  getCoveragePercentage,
} from '@/lib/location-tracker';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export default function DiscoveryRate() {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');

  const coverage = getCoveragePercentage();
  const velocity = getDiscoveryVelocity();

  const filteredDiscoveries = selectedRegion === 'All'
    ? MOCK_DISCOVERIES
    : MOCK_DISCOVERIES.filter(d => d.region === selectedRegion);

  const timelineData = {
    labels: DISCOVERY_TIMELINE.map(d => d.month),
    datasets: [{
      label: 'New Locations Discovered',
      data: DISCOVERY_TIMELINE.map(d => d.count),
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const velocityData = {
    labels: velocity.map(v => v.week),
    datasets: [{
      label: 'New Locations per Week',
      data: velocity.map(v => v.newLocations),
      backgroundColor: 'rgba(34,197,94,0.7)',
      borderRadius: 4,
    }],
  };

  const regionBarData = {
    labels: REGION_STATS.map(r => r.region),
    datasets: [
      {
        label: 'Total Locations',
        data: REGION_STATS.map(r => r.totalLocations),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 4,
      },
      {
        label: 'New This Month',
        data: REGION_STATS.map(r => r.newThisMonth),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Discovery</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>New Location Discovery Rate</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Track how quickly new geographic locations are being discovered across the platform.</p>
        </div>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, background: '#fff', cursor: 'pointer' }}
        >
          <option value="All">All Regions</option>
          {REGION_STATS.map(r => (
            <option key={r.region} value={r.region}>{r.region}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Locations', value: (MOCK_DISCOVERIES.length * 85 + 120).toLocaleString() },
          { label: 'Coverage', value: `${coverage}%` },
          { label: 'Avg Velocity', value: `${(velocity.reduce((a, v) => a + v.newLocations, 0) / velocity.length).toFixed(1)}/wk` },
          { label: 'Regions Active', value: REGION_STATS.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Discovery Timeline</h3>
          <Line data={timelineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Discovery Velocity by Week</h3>
          <Bar data={velocityData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Discovery by Region</h3>
          <Bar data={regionBarData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Recent Discoveries</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['City', 'Country', 'Region', 'Discovered'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDiscoveries.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '8px 10px' }}>{d.country}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: '#ede9fe', color: '#6366f1', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>{d.region}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{d.discoveredAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Geographic Frontier — Coverage by Region</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {REGION_STATS.map(r => (
            <div key={r.region} style={{ padding: 16, borderRadius: 14, border: '1px solid #e5e7eb', background: '#fafafa' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>{r.region}</p>
              <div style={{ position: 'relative', height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${r.coveragePct}%`, background: r.coveragePct >= 70 ? '#22c55e' : r.coveragePct >= 50 ? '#eab308' : '#ef4444', borderRadius: 4 }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>{r.totalLocations} locations — {r.coveragePct}% coverage</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
