'use client';

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line, Scatter, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

interface LedgerEntry {
  sequence: number;
  closeTimeMs: number;
  ledgerHash: string;
  txCount: number;
  baseFee: number;
  networkFee: number;
}

interface LatencySample {
  ledgerSequence: number;
  userPerceivedMs: number;
  walletResponseMs: number;
  indexerDelayMs: number;
  totalSubmitMs: number;
}

function generateLedgerData(count: number): LedgerEntry[] {
  const baseTime = Date.now() - count * 5000;
  return Array.from({ length: count }, (_, i) => {
    const base = 4000 + Math.sin(i * 0.15) * 800;
    const spike = (i % 37 === 0) ? 6000 : 0;
    const congestion = (i > 40 && i < 55) ? 2500 : 0;
    return {
      sequence: 95000000 + i,
      closeTimeMs: Math.round(base + spike + congestion + (Math.random() - 0.5) * 600),
      ledgerHash: `hash_${(95000000 + i).toString(16)}`,
      txCount: Math.round(40 + Math.sin(i * 0.3) * 20 + (spike > 0 ? 80 : 0)),
      baseFee: 100 + Math.round(Math.sin(i * 0.1) * 20),
      networkFee: Math.round(15 + (spike > 0 ? 40 : 0) + Math.random() * 10),
    };
  });
}

function generateLatencyData(ledgers: LedgerEntry[]): LatencySample[] {
  return ledgers.map((l) => ({
    ledgerSequence: l.sequence,
    userPerceivedMs: Math.round(l.closeTimeMs * 0.4 + 200 + Math.random() * 150 + (l.closeTimeMs > 6000 ? 1200 : 0)),
    walletResponseMs: Math.round(l.closeTimeMs * 0.3 + 100 + Math.random() * 80),
    indexerDelayMs: Math.round(l.closeTimeMs * 0.2 + 50 + Math.random() * 60),
    totalSubmitMs: Math.round(l.closeTimeMs * 0.8 + 300 + Math.random() * 200),
  }));
}

function detectSlowLedgers(ledgers: LedgerEntry[], thresholdMs = 6000): LedgerEntry[] {
  return ledgers.filter((l) => l.closeTimeMs > thresholdMs);
}

function calculateUxImpactScore(ledgers: LedgerEntry[]): {
  score: number;
  rating: 'excellent' | 'good' | 'degraded' | 'poor';
  factors: string[];
} {
  const avg = ledgers.reduce((s, l) => s + l.closeTimeMs, 0) / ledgers.length;
  const p95 = [...ledgers].sort((a, b) => a.closeTimeMs - b.closeTimeMs)[Math.floor(ledgers.length * 0.95)].closeTimeMs;
  const slowCount = ledgers.filter((l) => l.closeTimeMs > 6000).length;
  const slowPct = slowCount / ledgers.length;

  const factors: string[] = [];
  let score = 100;

  if (avg > 5000) { score -= 20; factors.push(`High avg close time: ${avg.toFixed(0)}ms`); }
  if (avg > 4000) { score -= 10; factors.push(`Avg close time above 4s`); }
  if (p95 > 8000) { score -= 20; factors.push(`P95 close time: ${p95}ms`); }
  if (slowPct > 0.1) { score -= 15; factors.push(`${(slowPct * 100).toFixed(1)}% slow ledgers`); }
  if (slowPct > 0.05) { score -= 10; factors.push(`${(slowPct * 100).toFixed(1)}% ledgers exceed threshold`); }

  const rating = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'degraded' : 'poor';
  return { score: Math.max(0, score), rating, factors };
}

function detectCongestionPeriods(ledgers: LedgerEntry[]): { start: number; end: number; severity: 'low' | 'medium' | 'high' }[] {
  const periods: { start: number; end: number; severity: 'low' | 'medium' | 'high' }[] = [];
  let windowStart: number | null = null;

  for (let i = 0; i < ledgers.length; i++) {
    if (ledgers[i].closeTimeMs > 5500) {
      if (windowStart === null) windowStart = i;
    } else {
      if (windowStart !== null) {
        const duration = i - windowStart;
        const maxClose = Math.max(...ledgers.slice(windowStart, i).map((l) => l.closeTimeMs));
        const severity = maxClose > 8000 ? 'high' : maxClose > 6500 ? 'medium' : 'low';
        periods.push({
          start: ledgers[windowStart].sequence,
          end: ledgers[i - 1].sequence,
          severity,
        });
        windowStart = null;
      }
    }
  }
  if (windowStart !== null) {
    const maxClose = Math.max(...ledgers.slice(windowStart).map((l) => l.closeTimeMs));
    const severity = maxClose > 8000 ? 'high' : maxClose > 6500 ? 'medium' : 'low';
    periods.push({
      start: ledgers[windowStart].sequence,
      end: ledgers[ledgers.length - 1].sequence,
      severity,
    });
  }

  return periods;
}

const CLOSE_TIME_THRESHOLD = 6000;

export default function LedgerCloseAnalysis() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const counts = { '1h': 720, '6h': 4320, '24h': 17280 } as const;

  const ledgers = useMemo(() => generateLedgerData(counts[timeRange]), [timeRange]);
  const latency = useMemo(() => generateLatencyData(ledgers), [ledgers]);
  const slowLedgers = useMemo(() => detectSlowLedgers(ledgers, CLOSE_TIME_THRESHOLD), [ledgers]);
  const uxImpact = useMemo(() => calculateUxImpactScore(ledgers), [ledgers]);
  const congestionPeriods = useMemo(() => detectCongestionPeriods(ledgers), [ledgers]);

  const labels = ledgers.map((l) => l.sequence.toString());
  const sampledLabels = labels.filter((_, i) => i % Math.max(1, Math.floor(labels.length / 80)) === 0);

  const closeTimeData = useMemo(() => ({
    labels: sampledLabels,
    datasets: [
      {
        label: 'Ledger Close Time (ms)',
        data: ledgers.filter((_, i) => i % Math.max(1, Math.floor(labels.length / 80)) === 0).map((l) => l.closeTimeMs),
        borderColor: 'rgba(99,102,241,0.9)',
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99,102,241,0.25)');
          gradient.addColorStop(1, 'rgba(99,102,241,0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'Slow Threshold',
        data: sampledLabels.map(() => CLOSE_TIME_THRESHOLD),
        borderColor: 'rgba(239,68,68,0.7)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  }), [ledgers, sampledLabels, labels.length]);

  const latencyCorrelationData = useMemo(() => ({
    datasets: [
      {
        label: 'Close Time vs User Latency',
        data: latency.map((l) => ({
          x: ledgers.find((lg) => lg.sequence === l.ledgerSequence)?.closeTimeMs ?? 0,
          y: l.userPerceivedMs,
        })),
        backgroundColor: 'rgba(99,102,241,0.5)',
        borderColor: 'rgba(99,102,241,0.8)',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  }), [latency, ledgers]);

  const txCountData = useMemo(() => ({
    labels: sampledLabels,
    datasets: [
      {
        label: 'Transaction Count',
        data: ledgers.filter((_, i) => i % Math.max(1, Math.floor(labels.length / 80)) === 0).map((l) => l.txCount),
        backgroundColor: ledgers
          .filter((_, i) => i % Math.max(1, Math.floor(labels.length / 80)) === 0)
          .map((l) =>
            l.closeTimeMs > CLOSE_TIME_THRESHOLD
              ? 'rgba(239,68,68,0.7)'
              : 'rgba(34,197,94,0.6)'
          ),
        borderRadius: 4,
      },
    ],
  }), [ledgers, sampledLabels, labels.length]);

  const impactColor = uxImpact.rating === 'excellent' ? '#22c55e'
    : uxImpact.rating === 'good' ? '#3b82f6'
    : uxImpact.rating === 'degraded' ? '#f59e0b'
    : '#ef4444';

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(59,130,246,0.10) 100%)',
        borderRadius: 22,
        padding: '24px 28px',
        marginBottom: 20,
        border: '1px solid rgba(99,102,241,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
              Ledger Close Time Analysis
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Stellar network performance impact on user experience
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['1h', '6h', '24h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: timeRange === r ? '#6366f1' : '#d1d5db',
                  background: timeRange === r ? '#6366f1' : 'transparent',
                  color: timeRange === r ? '#fff' : '#374151',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Avg Close Time', value: `${(ledgers.reduce((s, l) => s + l.closeTimeMs, 0) / ledgers.length).toFixed(0)}ms`, color: '#6366f1' },
          { label: 'P95 Close Time', value: `${[...ledgers].sort((a, b) => a.closeTimeMs - b.closeTimeMs)[Math.floor(ledgers.length * 0.95)].closeTimeMs}ms`, color: '#f59e0b' },
          { label: 'Slow Ledgers', value: `${slowLedgers.length} (${((slowLedgers.length / ledgers.length) * 100).toFixed(1)}%)`, color: '#ef4444' },
          { label: 'Congestion Periods', value: congestionPeriods.length.toString(), color: '#8b5cf6' },
          { label: 'UX Impact Score', value: `${uxImpact.score}/100`, color: impactColor },
          { label: 'Network Rating', value: uxImpact.rating.toUpperCase(), color: impactColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Close Time Trend */}
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Ledger Close Time Trend</h3>
        <div style={{ height: 280 }}>
          <Line data={closeTimeData} options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
              tooltip: {
                backgroundColor: 'rgba(17,24,39,0.9)',
                titleColor: '#f9fafb',
                bodyColor: '#c7d2fe',
                padding: 10,
                cornerRadius: 8,
                filter: (item: TooltipItem<'line'>) => item.dataset.label !== 'Slow Threshold',
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12, font: { size: 11 } }, border: { color: '#e5e7eb' } },
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: number | string) => `${v}ms` }, border: { display: false } },
            },
          }} />
        </div>
      </div>

      {/* Correlation scatter + Tx count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Close Time vs User Latency</h3>
          <div style={{ height: 240 }}>
            <Scatter data={latencyCorrelationData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(17,24,39,0.9)',
                  titleColor: '#f9fafb',
                  bodyColor: '#c7d2fe',
                  padding: 10,
                  cornerRadius: 8,
                  callbacks: {
                    label: (item) => `Close: ${item.parsed.x}ms → User: ${item.parsed.y}ms`,
                  },
                },
              },
              scales: {
                x: { title: { display: true, text: 'Ledger Close Time (ms)' }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
                y: { title: { display: true, text: 'User-Perceived Latency (ms)' }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
              },
            }} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Transaction Volume by Close Time</h3>
          <div style={{ height: 240 }}>
            <Bar data={txCountData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(17,24,39,0.9)',
                  titleColor: '#f9fafb',
                  bodyColor: '#c7d2fe',
                  padding: 10,
                  cornerRadius: 8,
                  filter: (item: TooltipItem<'bar'>) => true,
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { display: false }, border: { color: '#e5e7eb' } },
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } }, border: { display: false } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* UX Impact + Congestion */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>UX Impact Assessment</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${impactColor}22, ${impactColor}11)`,
              border: `2px solid ${impactColor}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              color: impactColor,
            }}>
              {uxImpact.score}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Rating</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: impactColor, textTransform: 'uppercase' }}>{uxImpact.rating}</div>
            </div>
          </div>
          {uxImpact.factors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uxImpact.factors.map((f, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: 12,
                  color: '#991b1b',
                }}>
                  {f}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
              All metrics within healthy thresholds.
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Network Congestion Periods</h3>
          {congestionPeriods.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {congestionPeriods.map((p, i) => {
                const sevColor = p.severity === 'high' ? '#ef4444' : p.severity === 'medium' ? '#f59e0b' : '#3b82f6';
                const sevBg = p.severity === 'high' ? '#fef2f2' : p.severity === 'medium' ? '#fffbeb' : '#eff6ff';
                return (
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: sevBg,
                    border: `1px solid ${sevColor}33`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        Leder {p.start} → {p.end}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: sevColor,
                        textTransform: 'uppercase',
                        background: `${sevColor}15`,
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}>
                        {p.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {p.end - p.start + 1} consecutive slow ledgers
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
              No congestion periods detected in this time range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
