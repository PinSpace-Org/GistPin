'use client';

import { useMemo, useState } from 'react';

interface GeohashCell {
  geohash: string;
  lat: number;
  lng: number;
  gistCount: number;
  ageDays: number;
  lastActivity: string;
}

interface CellAgeMapProps {
  cells: GeohashCell[];
}

function geohashToBounds(geohash: string): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90; let maxLat = 90;
  let minLng = -180; let maxLng = 180;
  let isEven = true;

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;
      if (isEven) {
        const mid = (minLng + maxLng) / 2;
        if (bit === 1) minLng = mid;
        else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bit === 1) minLat = mid;
        else maxLat = mid;
      }
      isEven = !isEven;
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

function ageColor(ageDays: number): string {
  if (ageDays <= 7) return '#22c55e';
  if (ageDays <= 30) return '#84cc16';
  if (ageDays <= 90) return '#eab308';
  if (ageDays <= 180) return '#f97316';
  if (ageDays <= 365) return '#ef4444';
  return '#7c3aed';
}

function ageLabel(ageDays: number): string {
  if (ageDays <= 7) return '< 1 week';
  if (ageDays <= 30) return '< 1 month';
  if (ageDays <= 90) return '< 3 months';
  if (ageDays <= 180) return '< 6 months';
  if (ageDays <= 365) return '< 1 year';
  return '> 1 year';
}

export default function CellAgeMap({ cells }: CellAgeMapProps) {
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(Infinity);
  const [sortBy, setSortBy] = useState<'age' | 'count'>('age');

  const filteredCells = useMemo(
    () => cells
      .filter((c) => c.ageDays >= minAge && c.ageDays <= maxAge)
      .sort((a, b) => sortBy === 'age' ? b.ageDays - a.ageDays : b.gistCount - a.gistCount),
    [cells, minAge, maxAge, sortBy]
  );

  const stats = useMemo(() => {
    if (cells.length === 0) return null;
    const ages = cells.map((c) => c.ageDays);
    return {
      totalCells: cells.length,
      avgAge: Math.round(ages.reduce((s, v) => s + v, 0) / ages.length),
      maxAge: Math.max(...ages),
      minAge: Math.min(...ages),
      totalGists: cells.reduce((s, c) => s + c.gistCount, 0),
    };
  }, [cells]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Active Cells', value: stats.totalCells },
            { label: 'Avg Age', value: `${stats.avgAge} days` },
            { label: 'Oldest Cell', value: `${stats.maxAge} days` },
            { label: 'Total Gists', value: stats.totalGists.toLocaleString() },
          ].map((s) => (
            <div key={s.label} style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#475569' }}>Min Age (days):</label>
          <input type="number" value={minAge} min={0} onChange={(e) => setMinAge(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', width: 70, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#475569' }}>Max Age (days):</label>
          <input type="number" value={maxAge === Infinity ? '' : maxAge} min={0} onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : Infinity)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', width: 70, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['age', 'count'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: sortBy === s ? '#1e293b' : '#fff',
                color: sortBy === s ? '#fff' : '#475569',
              }}
            >
              Sort by {s === 'age' ? 'Age' : 'Gist Count'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: '< 1 week', color: '#22c55e', min: 0, max: 7 },
          { label: '< 1 month', color: '#84cc16', min: 8, max: 30 },
          { label: '< 3 months', color: '#eab308', min: 31, max: 90 },
          { label: '< 6 months', color: '#f97316', min: 91, max: 180 },
          { label: '< 1 year', color: '#ef4444', min: 181, max: 365 },
          { label: '> 1 year', color: '#7c3aed', min: 366, max: Infinity },
        ].map((bucket) => {
          const count = filteredCells.filter((c) => c.ageDays >= bucket.min && c.ageDays <= bucket.max).length;
          return (
            <div
              key={bucket.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                background: bucket.color + '15',
                fontSize: 12,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: bucket.color }} />
              <span style={{ color: '#475569' }}>{bucket.label}</span>
              <span style={{ fontWeight: 700 }}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {filteredCells.slice(0, 100).map((cell) => {
          const bounds = geohashToBounds(cell.geohash);
          const centerLat = ((bounds.minLat + bounds.maxLat) / 2).toFixed(4);
          const centerLng = ((bounds.minLng + bounds.maxLng) / 2).toFixed(4);
          return (
            <div
              key={cell.geohash}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '8px 14px',
                borderRadius: 10,
                background: '#fff',
                border: '1px solid #f1f5f9',
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cell.geohash}</span>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                  ({centerLat}, {centerLng})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ageColor(cell.ageDays) }} />
                <span>{cell.ageDays}d — {ageLabel(cell.ageDays)}</span>
              </div>
              <div style={{ color: '#64748b' }}>{cell.gistCount.toLocaleString()} gists</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{cell.lastActivity}</div>
            </div>
          );
        })}
      </div>

      {filteredCells.length > 100 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', padding: 12 }}>
          Showing 100 of {filteredCells.length} cells. Refine filters to narrow results.
        </div>
      )}

      {filteredCells.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
          No geohash cells match the current filters.
        </div>
      )}
    </div>
  );
}
