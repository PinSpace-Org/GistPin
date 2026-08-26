'use client';

import { useState, useMemo, useRef, useCallback } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LOCATIONS = [
  { name: 'San Francisco', density: 'urban', baseRate: 85 },
  { name: 'New York', density: 'urban', baseRate: 78 },
  { name: 'London', density: 'urban', baseRate: 72 },
  { name: 'Berlin', density: 'urban', baseRate: 65 },
  { name: 'Tokyo', density: 'urban', baseRate: 70 },
  { name: 'Austin', density: 'suburban', baseRate: 45 },
  { name: 'Portland', density: 'suburban', baseRate: 38 },
  { name: 'Copenhagen', density: 'suburban', baseRate: 42 },
  { name: 'Nairobi', density: 'emerging', baseRate: 35 },
  { name: 'Buenos Aires', density: 'emerging', baseRate: 32 },
  { name: 'Mumbai', density: 'emerging', baseRate: 40 },
  { name: 'São Paulo', density: 'urban', baseRate: 55 },
];

function generateLocationData() {
  return LOCATIONS.map((loc) => {
    const cells: Record<string, number> = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const peakFactor = h >= 9 && h <= 21 ? 1.5 : h >= 0 && h <= 5 ? 0.3 : 0.8;
        const weekendFactor = d >= 5 ? 0.7 : 1.0;
        const jitter = 0.7 + Math.random() * 0.6;
        cells[`${d}-${h}`] = Math.round(loc.baseRate * peakFactor * weekendFactor * jitter);
      }
    }
    return { ...loc, cells };
  });
}

function detectAnomalies(cells: Record<string, number>): string[] {
  const values = Object.values(cells);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const anomalies: string[] = [];
  for (const [key, val] of Object.entries(cells)) {
    if (Math.abs(val - mean) > 2.2 * std) {
      const [d, h] = key.split('-').map(Number);
      anomalies.push(`${DAYS[d]} ${h}:00 (${val} posts, ${(val - mean).toFixed(0)} from mean)`);
    }
  }
  return anomalies;
}

function getHeatColor(value: number, max: number): string {
  const t = value / max;
  if (t === 0) return '#ebedf0';
  if (t < 0.15) return '#c6e48b';
  if (t < 0.3) return '#7bc96f';
  if (t < 0.5) return '#49af5d';
  if (t < 0.7) return '#2e8840';
  if (t < 0.85) return '#196127';
  return '#0f3d14';
}

function getDensityColor(density: string): string {
  switch (density) {
    case 'urban': return '#6366f1';
    case 'suburban': return '#f59e0b';
    case 'emerging': return '#10b981';
    default: return '#6b7280';
  }
}

export default function PostingPatternHeatmap() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const locationData = useMemo(generateLocationData, []);

  const filteredLocations = selectedLocation
    ? locationData.filter((l) => l.name === selectedLocation)
    : locationData;

  const globalMax = useMemo(() => {
    let max = 0;
    for (const loc of locationData) {
      for (const val of Object.values(loc.cells)) {
        if (val > max) max = val;
      }
    }
    return max;
  }, [locationData]);

  const aggregatedCells = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const loc of filteredLocations) {
      for (const [key, val] of Object.entries(loc.cells)) {
        agg[key] = (agg[key] ?? 0) + val;
      }
    }
    return agg;
  }, [filteredLocations]);

  const aggMax = Math.max(...Object.values(aggregatedCells), 1);

  const allAnomalies = useMemo(() => {
    const result: { location: string; anomalies: string[] }[] = [];
    for (const loc of locationData) {
      const anom = detectAnomalies(loc.cells);
      if (anom.length > 0) result.push({ location: loc.name, anomalies: anom });
    }
    return result;
  }, [locationData]);

  const visibleDays = selectedDay !== null ? [selectedDay] : Array.from({ length: 7 }, (_, i) => i);

  const exportHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cellSize = 32;
    const leftPad = 50;
    const topPad = 36;
    canvas.width = leftPad + 24 * cellSize + 20;
    canvas.height = topPad + visibleDays.length * (cellSize + 4) + 40;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#9ca3af';
    for (let h = 0; h < 24; h++) {
      ctx.fillText(`${h}`, leftPad + h * cellSize + 10, topPad - 8);
    }
    visibleDays.forEach((d, di) => {
      ctx.fillStyle = '#475569';
      ctx.fillText(DAYS[d], 4, topPad + di * (cellSize + 4) + 20);
      for (let h = 0; h < 24; h++) {
        const val = aggregatedCells[`${d}-${h}`] ?? 0;
        ctx.fillStyle = getHeatColor(val, aggMax);
        ctx.fillRect(leftPad + h * (cellSize + 2), topPad + di * (cellSize + 4), cellSize, cellSize);
      }
    });
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.fillText('GistPin Geographic Posting Heatmap', 4, canvas.height - 10);
    const link = document.createElement('a');
    link.download = 'posting-pattern-heatmap.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [aggregatedCells, aggMax, visibleDays]);

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Day of Week</label>
          <select
            value={selectedDay ?? ''}
            onChange={(e) => setSelectedDay(e.target.value === '' ? null : Number(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}
          >
            <option value="">All Days</option>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
          <select
            value={selectedLocation ?? ''}
            onChange={(e) => setSelectedLocation(e.target.value === '' ? null : e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}
          >
            <option value="">All Locations</option>
            {LOCATIONS.map((l) => (
              <option key={l.name} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAnomalies(!showAnomalies)}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: showAnomalies ? '#6366f1' : '#fff', color: showAnomalies ? '#fff' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 18 }}
        >
          {showAnomalies ? 'Hide Anomalies' : 'Detect Anomalies'}
        </button>
        <button
          onClick={exportHeatmap}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #10b981', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 18 }}
        >
          Export PNG
        </button>
      </div>

      {/* Urban density legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {['urban', 'suburban', 'emerging'].map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: getDensityColor(d) }} />
            <span style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 1, marginBottom: 4, marginLeft: 44 }}>
          {HOURS.map((h) => (
            <div key={h} style={{ width: 32, textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>
              {h % 3 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
        {visibleDays.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
            <span style={{ width: 40, fontSize: 11, color: '#475569', textAlign: 'right', paddingRight: 4, fontWeight: 600 }}>{DAYS[d]}</span>
            {HOURS.map((h) => {
              const val = aggregatedCells[`${d}-${h}`] ?? 0;
              return (
                <div
                  key={h}
                  title={`${DAYS[d]} ${h}:00 — ${val} posts`}
                  style={{ width: 32, height: 24, borderRadius: 3, backgroundColor: getHeatColor(val, aggMax), cursor: 'default' }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Per-location mini heatmaps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {filteredLocations.map((loc) => {
          const locMax = Math.max(...Object.values(loc.cells));
          return (
            <div key={loc.name} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(148,163,184,0.16)', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: getDensityColor(loc.density) }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{loc.name}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>({loc.density})</span>
              </div>
              {DAYS.map((day, d) => (
                <div key={d} style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
                  <span style={{ width: 24, fontSize: 9, color: '#9ca3af', textAlign: 'right', paddingRight: 3 }}>{day[0]}</span>
                  {HOURS.map((h) => {
                    const val = loc.cells[`${d}-${h}`] ?? 0;
                    return (
                      <div key={h} title={`${day} ${h}:00 — ${val}`} style={{ width: 10, height: 8, borderRadius: 1, backgroundColor: getHeatColor(val, locMax) }} />
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Anomaly detection panel */}
      {showAnomalies && (
        <div style={{ padding: 18, borderRadius: 16, border: '1px solid rgba(245,158,11,0.3)', background: '#fffbeb', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#92400e' }}>Pattern Anomalies Detected</h3>
          {allAnomalies.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#78716c' }}>No significant anomalies detected across selected locations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allAnomalies.map((item) => (
                <div key={item.location}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>{item.location}</span>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {item.anomalies.slice(0, 3).map((a, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#78716c' }}>{a}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Aggregated across {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} · Hover cells for counts</p>
    </div>
  );
}
