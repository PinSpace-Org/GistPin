'use client';

import { useState } from 'react';

const allClicks = [
  { x: 15, y: 12, t: 0 }, { x: 18, y: 14, t: 0 }, { x: 16, y: 13, t: 0 },
  { x: 50, y: 30, t: 0 }, { x: 52, y: 31, t: 0 }, { x: 51, y: 29, t: 0 }, { x: 53, y: 30, t: 0 },
  { x: 80, y: 20, t: 1 }, { x: 82, y: 22, t: 1 }, { x: 79, y: 21, t: 1 },
  { x: 30, y: 60, t: 1 }, { x: 31, y: 62, t: 1 },
  { x: 65, y: 70, t: 2 }, { x: 66, y: 71, t: 2 }, { x: 64, y: 69, t: 2 }, { x: 67, y: 70, t: 2 }, { x: 65, y: 72, t: 2 },
  { x: 20, y: 80, t: 2 }, { x: 22, y: 81, t: 2 },
  { x: 90, y: 85, t: 3 }, { x: 88, y: 84, t: 3 },
  { x: 45, y: 50, t: 3 }, { x: 46, y: 51, t: 3 }, { x: 44, y: 49, t: 3 },
];

const RANGES = ['All time', 'Last 24h', 'Last 7d', 'Last 30d'];

function density(x: number, y: number, clicks: typeof allClicks) {
  return clicks.filter((c) => Math.hypot(c.x - x, c.y - y) < 8).length;
}

function heatColor(d: number, max: number) {
  if (d === 0) return 'transparent';
  const t = d / max;
  if (t < 0.33) return `rgba(59,130,246,${(t / 0.33) * 0.6})`;
  if (t < 0.66) return `rgba(245,158,11,${0.4 + ((t - 0.33) / 0.33) * 0.4})`;
  return `rgba(239,68,68,${0.6 + ((t - 0.66) / 0.34) * 0.4})`;
}

export default function ClickHeatmap() {
  const [range, setRange] = useState(0);

  const filtered = range === 0 ? allClicks : allClicks.filter((c) => c.t >= range - 1);
  const grid = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => density(col * 10 + 5, row * 10 + 5, filtered))
  );
  const max = Math.max(1, ...grid.flat());

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {RANGES.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setRange(i)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: range === i ? '#1d4ed8' : '#e2e8f0',
              color: range === i ? '#fff' : '#374151',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: '10px 18px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>Total Clicks</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e3a8a' }}>{filtered.length}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 2,
          background: '#f8fafc',
          borderRadius: 12,
          padding: 8,
          border: '1px solid #e2e8f0',
          aspectRatio: '2 / 1',
        }}
      >
        {grid.flat().map((d, i) => (
          <div
            key={i}
            title={`${d} clicks`}
            style={{ background: heatColor(d, max), borderRadius: 4, transition: 'background 0.3s' }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: '#6b7280' }}>
        <span>Low</span>
        {['rgba(59,130,246,0.4)', 'rgba(245,158,11,0.6)', 'rgba(239,68,68,0.8)'].map((c) => (
          <div key={c} style={{ width: 24, height: 12, background: c, borderRadius: 3 }} />
        ))}
        <span>High</span>
      </div>
    </div>
  );
}
