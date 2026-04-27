'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-plugin-matrix';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, Tooltip, Legend, MatrixController, MatrixElement);

const FEATURES = ['Post Gist', 'Map View', 'Search', 'Reactions', 'Comments', 'Profile'];
const SEGMENTS = ['Power Users', 'Casual', 'New Users', 'Mobile', 'Desktop'];

const RAW: number[][] = [
  [95, 88, 72, 60, 45, 30],
  [70, 65, 55, 40, 28, 20],
  [50, 80, 45, 25, 15, 10],
  [85, 90, 60, 55, 35, 22],
  [78, 75, 68, 48, 42, 35],
];

function colorForValue(v: number): string {
  const r = Math.round(99 + (239 - 99) * (v / 100));
  const g = Math.round(102 + (68 - 102) * (v / 100));
  const b = Math.round(241 + (68 - 241) * (v / 100));
  return `rgba(${r},${g},${b},0.85)`;
}

export default function FeatureHeatmap() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const cellW = 80;
  const cellH = 44;
  const labelW = 100;
  const labelH = 36;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: labelW }}>
          {FEATURES.map((f) => (
            <div key={f} style={{ width: cellW, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', padding: '4px 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</div>
          ))}
        </div>
        {/* Rows */}
        {SEGMENTS.map((seg, si) => (
          <div key={seg} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: labelW, fontSize: 12, fontWeight: 700, color: '#475569', paddingRight: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>{seg}</div>
            {FEATURES.map((feat, fi) => {
              const v = RAW[si][fi];
              return (
                <div
                  key={feat}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: `${seg} × ${feat}: ${v}%` })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ width: cellW, height: cellH, background: colorForValue(v), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', margin: 2, borderRadius: 6, cursor: 'default', userSelect: 'none' }}
                >
                  {v}%
                </div>
              );
            })}
          </div>
        ))}
        {/* Tooltip */}
        {tooltip && (
          <div style={{ position: 'fixed', top: tooltip.y + 12, left: tooltip.x + 12, background: 'rgba(17,24,39,0.92)', color: '#f9fafb', padding: '6px 12px', borderRadius: 8, fontSize: 13, pointerEvents: 'none', zIndex: 9999 }}>
            {tooltip.label}
          </div>
        )}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: '#64748b' }}>
        <span>Low</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[10, 30, 50, 70, 90].map((v) => (
            <div key={v} style={{ width: 24, height: 14, background: colorForValue(v), borderRadius: 3 }} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
