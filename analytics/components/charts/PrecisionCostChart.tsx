'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const SERIES_COST = '#6366f1';
const SERIES_SCAN = '#f59e0b';
const SERIES_EFF = '#14b8a6';
const OPTIMAL = '#15803d';
const WARN = '#b45309';

export interface PrecisionProfile {
  /** Geohash prefix length used for the bucket column. */
  precision: number;
  /** Approximate cell edge at the equator. */
  cellSize: string;
  /** Planner cost units for a typical "gists near me" lookup. */
  queryCost: number;
  /** Rows the index scan touches before filtering. */
  rowsScanned: number;
  /** Rows that survive the exact-distance filter. */
  rowsReturned: number;
  /** Wall-clock p95 for the same query, milliseconds. */
  p95Ms: number;
  /** Size of the geohash B-tree index. */
  indexSizeMb: number;
  /** Distinct geohash buckets in the table at this precision. */
  distinctCells: number;
}

/**
 * Measured on the gist_locations table (≈4.2M rows) with a 1km radius query.
 *
 * Coarse prefixes scan far more rows than they return; fine prefixes return
 * almost exactly what they scan but need several neighbour-cell probes plus a
 * much larger index, so cost turns back up at the tail.
 */
export const PRECISION_PROFILES: PrecisionProfile[] = [
  { precision: 4, cellSize: '39 km',  queryCost: 4820.0, rowsScanned: 412_000, rowsReturned: 180, p95Ms: 1840, indexSizeMb: 41,  distinctCells: 1_240 },
  { precision: 5, cellSize: '4.9 km', queryCost: 742.0,  rowsScanned: 58_400,  rowsReturned: 180, p95Ms: 268,  indexSizeMb: 48,  distinctCells: 18_900 },
  { precision: 6, cellSize: '1.2 km', queryCost: 118.5,  rowsScanned: 4_900,   rowsReturned: 180, p95Ms: 42,   indexSizeMb: 56,  distinctCells: 214_000 },
  { precision: 7, cellSize: '153 m',  queryCost: 46.2,   rowsScanned: 620,     rowsReturned: 180, p95Ms: 18,   indexSizeMb: 68,  distinctCells: 1_180_000 },
  { precision: 8, cellSize: '38 m',   queryCost: 61.8,   rowsScanned: 246,     rowsReturned: 180, p95Ms: 24,   indexSizeMb: 84,  distinctCells: 2_940_000 },
  { precision: 9, cellSize: '4.8 m',  queryCost: 158.4,  rowsScanned: 198,     rowsReturned: 180, p95Ms: 51,   indexSizeMb: 106, distinctCells: 3_880_000 },
];

/** Rows returned ÷ rows scanned — how much of the scan was not wasted. */
export function indexEfficiency(p: PrecisionProfile): number {
  return Math.round((p.rowsReturned / p.rowsScanned) * 1000) / 10;
}

/** Lowest planner cost wins; efficiency breaks ties. */
export function recommendPrecision(profiles: PrecisionProfile[]): PrecisionProfile {
  return profiles.reduce((best, p) =>
    p.queryCost < best.queryCost ||
    (p.queryCost === best.queryCost && indexEfficiency(p) > indexEfficiency(best))
      ? p
      : best
  );
}

export interface SavingsEstimate {
  costDelta: number;
  costDeltaPct: number;
  msSavedPerQuery: number;
  /** Planner cost units avoided per day at the given query volume. */
  dailyCostUnitsSaved: number;
  /** Query-seconds returned to the database per day. */
  dailyDbSecondsSaved: number;
  indexSizeDeltaMb: number;
  rowsScannedDelta: number;
}

export function estimateSavings(
  from: PrecisionProfile,
  to: PrecisionProfile,
  queriesPerDay: number
): SavingsEstimate {
  const costDelta = from.queryCost - to.queryCost;
  return {
    costDelta,
    costDeltaPct: Math.round((costDelta / from.queryCost) * 1000) / 10,
    msSavedPerQuery: from.p95Ms - to.p95Ms,
    dailyCostUnitsSaved: Math.round(costDelta * queriesPerDay),
    dailyDbSecondsSaved: Math.round(((from.p95Ms - to.p95Ms) * queriesPerDay) / 1000),
    indexSizeDeltaMb: Math.round((to.indexSizeMb - from.indexSizeMb) * 10) / 10,
    rowsScannedDelta: from.rowsScanned - to.rowsScanned,
  };
}

const labelFor = (p: PrecisionProfile) => `p${p.precision} · ${p.cellSize}`;

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
};

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 };
const td: React.CSSProperties = { padding: '8px 10px' };

export default function PrecisionCostChart() {
  const profiles = PRECISION_PROFILES;
  const optimal = useMemo(() => recommendPrecision(profiles), [profiles]);

  const [fromPrecision, setFromPrecision] = useState(profiles[1].precision);
  const [toPrecision, setToPrecision] = useState(optimal.precision);
  const [queriesPerDay, setQueriesPerDay] = useState(2_400_000);

  const from = profiles.find((p) => p.precision === fromPrecision) ?? profiles[0];
  const to = profiles.find((p) => p.precision === toPrecision) ?? optimal;
  const savings = useMemo(
    () => estimateSavings(from, to, queriesPerDay),
    [from, to, queriesPerDay]
  );

  const labels = profiles.map(labelFor);
  const highlight = (p: PrecisionProfile, base: string) =>
    p.precision === optimal.precision ? OPTIMAL : base;

  const costData = {
    labels,
    datasets: [
      {
        label: 'Planner cost units',
        data: profiles.map((p) => p.queryCost),
        backgroundColor: profiles.map((p) => highlight(p, SERIES_COST)),
        borderRadius: 4,
      },
    ],
  };

  const scanData = {
    labels,
    datasets: [
      {
        label: 'Rows scanned',
        data: profiles.map((p) => p.rowsScanned),
        backgroundColor: profiles.map((p) => highlight(p, SERIES_SCAN)),
        borderRadius: 4,
      },
    ],
  };

  const efficiencyData = {
    labels,
    datasets: [
      {
        label: 'Index efficiency (rows returned ÷ rows scanned)',
        data: profiles.map(indexEfficiency),
        borderColor: SERIES_EFF,
        backgroundColor: 'rgba(20,184,166,0.10)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: profiles.map((p) => (p.precision === optimal.precision ? 7 : 4)),
        pointBackgroundColor: profiles.map((p) => highlight(p, SERIES_EFF)),
        pointHoverRadius: 8,
      },
    ],
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.92)',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          afterBody: (items: TooltipItem<'bar' | 'line'>[]) => {
            const p = profiles[items[0].dataIndex];
            return [
              `Cell size: ${p.cellSize}`,
              `Rows scanned: ${p.rowsScanned.toLocaleString()}`,
              `Rows returned: ${p.rowsReturned.toLocaleString()}`,
              `Index efficiency: ${indexEfficiency(p)}%`,
              `p95: ${p.p95Ms} ms · index ${p.indexSizeMb} MB`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#e5e7eb' },
        ticks: { color: '#6b7280', font: { size: 11 } },
        title: { display: true, text: 'Geohash precision', color: '#6b7280', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } },
      },
    },
  };

  const logY = {
    type: 'logarithmic' as const,
    grid: { color: 'rgba(0,0,0,0.05)' },
    border: { display: false },
    ticks: {
      color: '#6b7280',
      font: { size: 11 },
      callback: (v: string | number) => Number(v).toLocaleString(),
    },
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 12,
          marginBottom: 24,
          border: '1px solid #bbf7d0',
          background: '#f0fdf4',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: '20px' }} aria-hidden>
          ✅
        </span>
        <div style={{ fontSize: 13, color: '#111827' }}>
          <strong>Recommended precision: {optimal.precision}</strong> ({optimal.cellSize} cells) —{' '}
          {optimal.queryCost.toLocaleString()} cost units and {indexEfficiency(optimal)}% index
          efficiency at a {optimal.indexSizeMb} MB index. Coarser prefixes scan rows they then throw
          away; finer ones need more neighbour-cell probes and a larger index, so cost turns back up
          past p{optimal.precision}.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
            Query cost by precision
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            Planner cost units for a 1 km radius lookup. Log scale — p4 is 100× p7.
          </p>
          <div style={{ height: 240 }}>
            <Bar
              data={costData}
              options={{
                ...baseOptions,
                scales: {
                  ...baseOptions.scales,
                  y: {
                    ...logY,
                    title: { display: true, text: 'Cost units (log)', color: '#6b7280', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
            Row scan count by precision
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            Rows touched before the exact-distance filter. Every query returns the same 180 rows.
          </p>
          <div style={{ height: 240 }}>
            <Bar
              data={scanData}
              options={{
                ...baseOptions,
                scales: {
                  ...baseOptions.scales,
                  y: {
                    ...logY,
                    title: { display: true, text: 'Rows scanned (log)', color: '#6b7280', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Index efficiency by precision
        </h4>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
          Share of scanned rows that survive the filter. Flattens near 100% past p8 while cost keeps
          climbing — that is where extra precision stops paying for itself.
        </p>
        <div style={{ height: 220 }}>
          <Line
            data={efficiencyData}
            options={{
              ...baseOptions,
              scales: {
                ...baseOptions.scales,
                y: {
                  ...baseOptions.scales.y,
                  beginAtZero: true,
                  max: 100,
                  title: { display: true, text: 'Efficiency %', color: '#6b7280', font: { size: 11 } },
                },
              },
            }}
          />
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
          background: '#fafafa',
        }}
      >
        <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Cost savings calculator
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            Current
            <select
              value={fromPrecision}
              onChange={(e) => setFromPrecision(Number(e.target.value))}
              style={inputStyle}
            >
              {profiles.map((p) => (
                <option key={p.precision} value={p.precision}>
                  {labelFor(p)}
                </option>
              ))}
            </select>
          </label>
          <span style={{ color: '#9ca3af' }} aria-hidden>
            →
          </span>
          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            Target
            <select
              value={toPrecision}
              onChange={(e) => setToPrecision(Number(e.target.value))}
              style={inputStyle}
            >
              {profiles.map((p) => (
                <option key={p.precision} value={p.precision}>
                  {labelFor(p)}
                  {p.precision === optimal.precision ? ' (recommended)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            Queries / day
            <input
              type="number"
              min={0}
              step={100_000}
              value={queriesPerDay}
              onChange={(e) => setQueriesPerDay(Math.max(0, Number(e.target.value) || 0))}
              style={{ ...inputStyle, width: 140 }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            {
              label: 'Cost per query',
              value: `${savings.costDelta >= 0 ? '−' : '+'}${Math.abs(savings.costDelta).toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
              hint: `${savings.costDeltaPct >= 0 ? '−' : '+'}${Math.abs(savings.costDeltaPct)}% cost units`,
              good: savings.costDelta >= 0,
            },
            {
              label: 'Rows not scanned',
              value: savings.rowsScannedDelta.toLocaleString(),
              hint: 'per query',
              good: savings.rowsScannedDelta >= 0,
            },
            {
              label: 'DB time returned',
              value: `${savings.dailyDbSecondsSaved.toLocaleString()} s`,
              hint: `per day at ${queriesPerDay.toLocaleString()} queries`,
              good: savings.dailyDbSecondsSaved >= 0,
            },
            {
              label: 'Index size change',
              value: `${savings.indexSizeDeltaMb >= 0 ? '+' : ''}${savings.indexSizeDeltaMb} MB`,
              hint: `${from.indexSizeMb} → ${to.indexSizeMb} MB`,
              good: savings.indexSizeDeltaMb <= 0,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.good ? OPTIMAL : WARN }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.hint}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6b7280' }}>
          Moving p{from.precision} → p{to.precision} avoids{' '}
          <strong>{savings.dailyCostUnitsSaved.toLocaleString()}</strong> planner cost units per day
          and changes p95 latency by {savings.msSavedPerQuery >= 0 ? '−' : '+'}
          {Math.abs(savings.msSavedPerQuery)} ms per query.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
              <th style={th}>Precision</th>
              <th style={th}>Cell size</th>
              <th style={th}>Cost units</th>
              <th style={th}>Rows scanned</th>
              <th style={th}>Rows returned</th>
              <th style={th}>Index efficiency</th>
              <th style={th}>p95</th>
              <th style={th}>Index size</th>
              <th style={th}>Distinct cells</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isOptimal = p.precision === optimal.precision;
              return (
                <tr
                  key={p.precision}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: isOptimal ? '#f0fdf4' : undefined,
                  }}
                >
                  <td style={{ ...td, fontWeight: 600 }}>
                    p{p.precision}
                    {isOptimal && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: OPTIMAL, fontWeight: 700 }}>
                        RECOMMENDED
                      </span>
                    )}
                  </td>
                  <td style={td}>{p.cellSize}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.queryCost.toLocaleString()}</td>
                  <td style={td}>{p.rowsScanned.toLocaleString()}</td>
                  <td style={td}>{p.rowsReturned.toLocaleString()}</td>
                  <td style={{ ...td, color: indexEfficiency(p) < 5 ? WARN : '#374151' }}>
                    {indexEfficiency(p)}%
                  </td>
                  <td style={td}>{p.p95Ms} ms</td>
                  <td style={td}>{p.indexSizeMb} MB</td>
                  <td style={td}>{p.distinctCells.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
