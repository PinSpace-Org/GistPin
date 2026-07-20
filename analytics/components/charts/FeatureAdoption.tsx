'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useState, useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type SortKey = 'adoption' | 'name' | 'growth';

interface Feature {
  name: string;
  category: string;
  adoptionPct: number;
  weeklyGrowth: number;
  powerUserPct: number;
  deprecationSignal: 'low' | 'medium' | 'high';
  cohortRetention: number[];
}

const FEATURES: Feature[] = [
  { name: 'Gist Creation',       category: 'Core',      adoptionPct: 94, weeklyGrowth: 2.1, powerUserPct: 68, deprecationSignal: 'low',    cohortRetention: [82, 74, 68, 62, 58, 55] },
  { name: 'Wallet Connect',      category: 'Auth',      adoptionPct: 78, weeklyGrowth: 5.4, powerUserPct: 72, deprecationSignal: 'low',    cohortRetention: [71, 65, 59, 54, 50, 47] },
  { name: 'Location Tagging',    category: 'Core',      adoptionPct: 65, weeklyGrowth: 3.2, powerUserPct: 45, deprecationSignal: 'low',    cohortRetention: [58, 49, 42, 37, 33, 30] },
  { name: 'Geofencing',          category: 'Premium',   adoptionPct: 42, weeklyGrowth: 8.7, powerUserPct: 81, deprecationSignal: 'low',    cohortRetention: [48, 41, 36, 31, 28, 25] },
  { name: 'Tip Sending',         category: 'Premium',   adoptionPct: 38, weeklyGrowth: 6.3, powerUserPct: 76, deprecationSignal: 'low',    cohortRetention: [42, 35, 29, 25, 22, 20] },
  { name: 'Analytics Export',    category: 'Utility',   adoptionPct: 31, weeklyGrowth: 4.1, powerUserPct: 34, deprecationSignal: 'medium', cohortRetention: [35, 27, 22, 18, 15, 13] },
  { name: 'Social Sharing',      category: 'Social',    adoptionPct: 28, weeklyGrowth: 1.8, powerUserPct: 22, deprecationSignal: 'high',   cohortRetention: [31, 22, 16, 12, 9, 7] },
  { name: 'On-Chain Gists',      category: 'Premium',   adoptionPct: 22, weeklyGrowth: 12.4, powerUserPct: 91, deprecationSignal: 'low',   cohortRetention: [35, 30, 27, 24, 22, 20] },
  { name: 'IPFS Pinning',        category: 'Utility',   adoptionPct: 18, weeklyGrowth: 2.9, powerUserPct: 48, deprecationSignal: 'medium', cohortRetention: [28, 21, 16, 13, 11, 9] },
  { name: 'Legacy Embed',        category: 'Legacy',    adoptionPct: 12, weeklyGrowth: -5.2, powerUserPct: 8, deprecationSignal: 'high',  cohortRetention: [15, 9, 5, 3, 2, 1] },
];

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

export default function FeatureAdoption() {
  const [sortBy, setSortBy] = useState<SortKey>('adoption');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = useMemo(() => ['All', ...new Set(FEATURES.map((f) => f.category))], []);

  const filtered = useMemo(() => {
    let list = categoryFilter === 'All' ? [...FEATURES] : FEATURES.filter((f) => f.category === categoryFilter);
    list.sort((a, b) => {
      if (sortBy === 'adoption') return b.adoptionPct - a.adoptionPct;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.weeklyGrowth - a.weeklyGrowth;
    });
    return list;
  }, [sortBy, categoryFilter]);

  const barData = useMemo(() => ({
    labels: filtered.map((f) => f.name),
    datasets: [
      {
        label: 'Adoption %',
        data: filtered.map((f) => f.adoptionPct),
        backgroundColor: filtered.map((f) =>
          f.deprecationSignal === 'high' ? 'rgba(239,68,68,0.7)' :
          f.deprecationSignal === 'medium' ? 'rgba(251,191,36,0.7)' :
          'rgba(34,197,94,0.7)'
        ),
        borderRadius: 4,
      },
    ],
  }), [filtered]);

  const topFeature = FEATURES.reduce((a, b) => a.weeklyGrowth > b.weeklyGrowth ? a : b);

  const adoptionCurveData = useMemo(() => ({
    labels: WEEKS,
    datasets: FEATURES.filter((f) => f.adoptionPct > 30).slice(0, 4).map((f, i) => ({
      label: f.name,
      data: f.cohortRetention,
      borderColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'][i],
      tension: 0.3,
      pointRadius: 3,
    })),
  }), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['adoption', 'name', 'growth'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: '1px solid',
                borderColor: sortBy === k ? '#6366f1' : '#d1d5db',
                background: sortBy === k ? '#6366f1' : 'transparent',
                color: sortBy === k ? '#fff' : '#374151',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              Sort by {k}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              style={{
                padding: '4px 12px', borderRadius: 999, border: '1px solid #d1d5db',
                background: categoryFilter === c ? '#374151' : 'transparent',
                color: categoryFilter === c ? '#fff' : '#374151',
                fontWeight: 600, fontSize: 11, cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Avg Adoption',     value: `${Math.round(FEATURES.reduce((s, f) => s + f.adoptionPct, 0) / FEATURES.length)}%` },
          { label: 'Power User Rate',  value: `${Math.round(FEATURES.reduce((s, f) => s + f.powerUserPct, 0) / FEATURES.length)}%` },
          { label: 'Fastest Growing',  value: topFeature.name },
          { label: 'Deprecation Risk', value: FEATURES.filter((f) => f.deprecationSignal === 'high').length.toString() },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Feature Adoption %</h3>
        <Bar data={barData} options={{
          responsive: true,
          indexAxis: 'y' as const,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: 'Adoption %' } } },
        }} height={160} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Cohort Retention Curves</h3>
          <Line data={adoptionCurveData} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Retention %' } } },
          }} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Feature Detail Table</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Feature</th>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Category</th>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Adoption</th>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Growth</th>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Power Users</th>
                  <th style={{ padding: '6px 8px', color: '#6b7280' }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: '8px', color: '#6b7280' }}>{f.category}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{f.adoptionPct}%</td>
                    <td style={{ padding: '8px', color: f.weeklyGrowth >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {f.weeklyGrowth >= 0 ? '+' : ''}{f.weeklyGrowth}%
                    </td>
                    <td style={{ padding: '8px' }}>{f.powerUserPct}%</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        background: f.deprecationSignal === 'high' ? '#fef2f2' : f.deprecationSignal === 'medium' ? '#fefce8' : '#f0fdf4',
                        color: f.deprecationSignal === 'high' ? '#ef4444' : f.deprecationSignal === 'medium' ? '#b45309' : '#22c55e',
                        borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      }}>
                        {f.deprecationSignal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
