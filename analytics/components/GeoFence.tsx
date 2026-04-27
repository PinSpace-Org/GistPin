'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type GeoRegion,
  type GistPoint,
  type LatLng,
  computeRegionStats,
  filterGistsInRegion,
  loadRegions,
  saveRegions,
} from '@/lib/geofencing';

// ---------------------------------------------------------------------------
// Mock gist data
// ---------------------------------------------------------------------------
const MOCK_GISTS: GistPoint[] = [
  { id: '1', lat: 37.775, lng: -122.418, text: 'Great coffee here!',       sentiment: 'positive' },
  { id: '2', lat: 37.776, lng: -122.419, text: 'Broken streetlight.',       sentiment: 'negative' },
  { id: '3', lat: 37.774, lng: -122.417, text: 'Farmers market today.',     sentiment: 'neutral'  },
  { id: '4', lat: 37.780, lng: -122.410, text: 'Amazing mural on 5th.',     sentiment: 'positive' },
  { id: '5', lat: 37.770, lng: -122.425, text: 'Road closed ahead.',        sentiment: 'negative' },
  { id: '6', lat: 37.778, lng: -122.415, text: 'New park bench installed.', sentiment: 'neutral'  },
  { id: '7', lat: 37.773, lng: -122.420, text: 'Loud construction noise.',  sentiment: 'negative' },
  { id: '8', lat: 37.777, lng: -122.413, text: 'Free yoga in the park!',    sentiment: 'positive' },
];

// ---------------------------------------------------------------------------
// Simple SVG canvas for polygon drawing
// ---------------------------------------------------------------------------
const CANVAS_W = 600;
const CANVAS_H = 360;
const LAT_MIN = 37.765, LAT_MAX = 37.785;
const LNG_MIN = -122.430, LNG_MAX = -122.405;

function toCanvas(p: LatLng): [number, number] {
  const x = ((p.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * CANVAS_W;
  const y = CANVAS_H - ((p.lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * CANVAS_H;
  return [x, y];
}

function fromCanvas(x: number, y: number): LatLng {
  return {
    lng: (x / CANVAS_W) * (LNG_MAX - LNG_MIN) + LNG_MIN,
    lat: ((CANVAS_H - y) / CANVAS_H) * (LAT_MAX - LAT_MIN) + LAT_MIN,
  };
}

const SENTIMENT_COLOR = { positive: '#16a34a', negative: '#dc2626', neutral: '#6b7280' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GeoFence() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPoly, setCurrentPoly] = useState<LatLng[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState('');

  useEffect(() => { setRegions(loadRegions()); }, []);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    setCurrentPoly((prev) => [...prev, fromCanvas(x, y)]);
  };

  const closePolygon = () => {
    if (currentPoly.length < 3) return;
    const name = regionName.trim() || `Region ${regions.length + 1}`;
    const newRegion: GeoRegion = { id: Date.now().toString(), name, polygon: currentPoly };
    const updated = [...regions, newRegion];
    setRegions(updated);
    saveRegions(updated);
    setCurrentPoly([]);
    setDrawing(false);
    setRegionName('');
    setSelectedId(newRegion.id);
  };

  const deleteRegion = (id: string) => {
    const updated = regions.filter((r) => r.id !== id);
    setRegions(updated);
    saveRegions(updated);
    if (selectedId === id) setSelectedId(null);
  };

  const selected = regions.find((r) => r.id === selectedId) ?? null;
  const gistsInRegion = selected ? filterGistsInRegion(MOCK_GISTS, selected.polygon) : [];
  const stats = computeRegionStats(gistsInRegion);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {!drawing ? (
          <button
            onClick={() => { setDrawing(true); setCurrentPoly([]); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Draw Region
          </button>
        ) : (
          <>
            <input
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder="Region name…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              onClick={closePolygon}
              disabled={currentPoly.length < 3}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
            >
              Close & Save ({currentPoly.length} pts)
            </button>
            <button
              onClick={() => { setDrawing(false); setCurrentPoly([]); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </>
        )}
        {drawing && (
          <span className="text-xs text-gray-500">Click on the map to add polygon vertices.</span>
        )}
      </div>

      {/* Map canvas */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full"
          style={{ cursor: drawing ? 'crosshair' : 'default', background: '#e8f4f8' }}
          onClick={handleSvgClick}
        >
          {/* Grid */}
          {[...Array(6)].map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 100} y1={0} x2={(i + 1) * 100} y2={CANVAS_H} stroke="#ccc" strokeWidth={0.5} />
          ))}
          {[...Array(4)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i + 1) * 90} x2={CANVAS_W} y2={(i + 1) * 90} stroke="#ccc" strokeWidth={0.5} />
          ))}

          {/* Saved regions */}
          {regions.map((r) => {
            const pts = r.polygon.map(toCanvas);
            const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
            const isSelected = r.id === selectedId;
            return (
              <g key={r.id} onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }} style={{ cursor: 'pointer' }}>
                <path d={d} fill={isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)'} stroke={isSelected ? '#6366f1' : '#a5b4fc'} strokeWidth={isSelected ? 2 : 1} />
                {pts[0] && <text x={pts[0][0]} y={pts[0][1] - 6} fontSize={11} fill="#4338ca" fontWeight={600}>{r.name}</text>}
              </g>
            );
          })}

          {/* In-progress polygon */}
          {currentPoly.length > 0 && (
            <>
              <polyline
                points={currentPoly.map(toCanvas).map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              {currentPoly.map((p, i) => {
                const [x, y] = toCanvas(p);
                return <circle key={i} cx={x} cy={y} r={4} fill="#f59e0b" />;
              })}
            </>
          )}

          {/* Gist dots */}
          {MOCK_GISTS.map((g) => {
            const [x, y] = toCanvas({ lat: g.lat, lng: g.lng });
            return (
              <circle key={g.id} cx={x} cy={y} r={6} fill={SENTIMENT_COLOR[g.sentiment]} stroke="#fff" strokeWidth={1.5} opacity={0.9}>
                <title>{g.text}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Saved regions list */}
      {regions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Saved Regions</h2>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <div key={r.id} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer ${r.id === selectedId ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700'}`} onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}>
                <span>{r.name}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteRegion(r.id); }} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Region stats */}
      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Stats — {selected.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Gists', value: stats.total, color: 'text-gray-800 dark:text-gray-100' },
              { label: 'Positive',    value: stats.positive, color: 'text-green-600' },
              { label: 'Negative',    value: stats.negative, color: 'text-red-600' },
              { label: 'Neutral',     value: stats.neutral,  color: 'text-gray-500' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {gistsInRegion.length > 0 && (
            <ul className="space-y-1">
              {gistsInRegion.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm">
                  <span style={{ color: SENTIMENT_COLOR[g.sentiment] }}>●</span>
                  <span className="text-gray-700 dark:text-gray-300">{g.text}</span>
                </li>
              ))}
            </ul>
          )}
          {gistsInRegion.length === 0 && (
            <p className="text-sm text-gray-400">No gists found inside this region.</p>
          )}
        </div>
      )}
    </div>
  );
}
