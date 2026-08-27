'use client';

import { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler,
} from 'chart.js';
import { Bar, PolarArea } from 'react-chartjs-2';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, Tooltip, Legend, RadialLinearScale, Filler);

export interface RingDensity {
  radiusLabel: string;
  radiusMeters: number;
  gistCount: number;
  densityPerKm2: number;
  avgSentiment: number;
  topTags: string[];
}

export interface CenterPoint {
  lat: number;
  lng: number;
  name: string;
}

const MOCK_CENTERS: CenterPoint[] = [
  { lat: 6.5244, lng: 3.3792, name: 'Lagos Hub' },
  { lat: -1.2921, lng: 36.8219, name: 'Nairobi Center' },
  { lat: 51.5074, lng: -0.1278, name: 'London Node' },
  { lat: 40.7128, lng: -74.006, name: 'NYC Cluster' },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo Grid' },
];

const RING_RADII = [
  { label: '100m',  meters: 100 },
  { label: '250m',  meters: 250 },
  { label: '500m',  meters: 500 },
  { label: '1km',   meters: 1000 },
  { label: '5km',   meters: 5000 },
];

function generateRingData(center: CenterPoint): RingDensity[] {
  const tags = ['tech', 'finance', 'art', 'music', 'crypto', 'food', 'travel', 'sports', 'science', 'health'];
  const baseCounts = [320, 180, 95, 42, 12];
  const rng = (seed: number) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  };
  const rand = rng(Math.round(center.lat * 1000 + center.lng * 7));

  return RING_RADII.map((ring, i) => {
    const areaKm2 = Math.PI * Math.pow(ring.meters / 1000, 2);
    const count = Math.round(baseCounts[i] * (0.7 + rand() * 0.6));
    const selectedTags = tags
      .sort(() => rand() - 0.5)
      .slice(0, 3);
    return {
      radiusLabel: ring.label,
      radiusMeters: ring.meters,
      gistCount: count,
      densityPerKm2: areaKm2 > 0 ? Math.round(count / areaKm2) : 0,
      avgSentiment: +(0.5 + rand() * 0.4).toFixed(2),
      topTags: selectedTags,
    };
  });
}

const CARD_STYLE: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 22,
  padding: 24,
  border: '1px solid rgba(148,163,184,0.16)',
};

const RING_COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
const RING_BG = ['rgba(99,102,241,0.15)', 'rgba(59,130,246,0.15)', 'rgba(34,197,94,0.15)', 'rgba(245,158,11,0.15)', 'rgba(239,68,68,0.15)'];

export default function RadiusRings() {
  const [selectedCenter, setSelectedCenter] = useState<CenterPoint>(MOCK_CENTERS[0]);
  const [hoveredRing, setHoveredRing] = useState<number | null>(null);

  const ringData = generateRingData(selectedCenter);

  const barData = {
    labels: ringData.map((r) => r.radiusLabel),
    datasets: [{
      label: 'Gist Count',
      data: ringData.map((r) => r.gistCount),
      backgroundColor: RING_COLORS.map((c) => c + 'bb'),
      borderColor: RING_COLORS,
      borderWidth: 1,
      borderRadius: 5,
    }],
  };

  const barOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
    },
  };

  const densityBarData = {
    labels: ringData.map((r) => r.radiusLabel),
    datasets: [{
      label: 'Density (per km²)',
      data: ringData.map((r) => r.densityPerKm2),
      backgroundColor: RING_COLORS.map((c) => c + '99'),
      borderRadius: 4,
    }],
  };

  const densityBarOpts = {
    responsive: true,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af' }, border: { display: false } },
      y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 12 } }, border: { color: '#e5e7eb' } },
    },
  };

  const polarData = {
    labels: ringData.map((r) => r.radiusLabel),
    datasets: [{
      data: ringData.map((r) => r.gistCount),
      backgroundColor: RING_BG,
      borderColor: RING_COLORS,
      borderWidth: 2,
    }],
  };

  const polarOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#6b7280', boxWidth: 12 } },
    },
    scales: {
      r: {
        ticks: { display: false },
        grid: { color: 'rgba(148,163,184,0.15)' },
      },
    },
  };

  const totalGists = ringData.reduce((s, r) => s + r.gistCount, 0);
  const maxDensity = Math.max(...ringData.map((r) => r.densityPerKm2));

  const handleExport = useCallback(
    (onProgress: (p: number) => void) =>
      exportRowsToCsv({
        filenamePrefix: 'radius-ring-data',
        rows: ringData.map((r) => ({
          center: selectedCenter.name,
          lat: selectedCenter.lat,
          lng: selectedCenter.lng,
          radius: r.radiusLabel,
          gist_count: r.gistCount,
          density_per_km2: r.densityPerKm2,
          avg_sentiment: r.avgSentiment,
          top_tags: r.topTags.join(', '),
        })),
        onProgress,
      }),
    [ringData, selectedCenter]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            Gist Radius Heat Rings
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Density visualization across concentric distance rings from a center point.
          </p>
        </div>
        <ExportButton onExport={handleExport} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MOCK_CENTERS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setSelectedCenter(c)}
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: selectedCenter.name === c.name ? '1.5px solid #6366f1' : '1px solid rgba(148,163,184,0.25)',
              background: selectedCenter.name === c.name ? '#6366f1' : '#fff',
              color: selectedCenter.name === c.name ? '#fff' : '#475569',
              cursor: 'pointer',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Center', value: selectedCenter.name },
          { label: 'Coordinates', value: `${selectedCenter.lat}, ${selectedCenter.lng}` },
          { label: 'Total Gists', value: totalGists.toLocaleString() },
          { label: 'Peak Density', value: `${maxDensity.toLocaleString()} /km²` },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(148,163,184,0.16)' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {ringData.map((r, i) => (
          <div
            key={r.radiusLabel}
            onMouseEnter={() => setHoveredRing(i)}
            onMouseLeave={() => setHoveredRing(null)}
            style={{
              ...CARD_STYLE,
              borderColor: hoveredRing === i ? RING_COLORS[i] : 'rgba(148,163,184,0.16)',
              transform: hoveredRing === i ? 'translateY(-2px)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: RING_COLORS[i] }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{r.radiusLabel}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: RING_COLORS[i], marginBottom: 4 }}>
              {r.gistCount}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
              {r.densityPerKm2.toLocaleString()} /km² · {(r.avgSentiment * 100).toFixed(0)}% pos
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {r.topTags.map((t) => (
                <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: RING_BG[i], color: RING_COLORS[i], fontWeight: 600 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div style={CARD_STYLE}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Gists per Ring</h4>
          <Bar data={barData} options={barOpts} height={180} />
        </div>
        <div style={CARD_STYLE}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Density Comparison</h4>
          <Bar data={densityBarData} options={densityBarOpts} height={180} />
        </div>
        <div style={CARD_STYLE}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Ring Overview</h4>
          <PolarArea data={polarData} options={polarOpts} height={200} />
        </div>
      </div>
    </div>
  );
}
