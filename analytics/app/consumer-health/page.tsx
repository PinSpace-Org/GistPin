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
import type { TooltipItem } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import {
  SAMPLE_CONSUMERS,
  SCORE_WEIGHTS,
  STATUS_COLORS,
  UNHEALTHY_THRESHOLD,
  WATCH_THRESHOLD,
  fleetAverage,
  scoreAllConsumers,
  unhealthyAlerts,
  type HealthStatus,
} from '@/lib/consumer-health-score';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

// Categorical slots, validated for CVD separation on a light surface.
const SERIES = ['#6366f1', '#f59e0b', '#14b8a6'];
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  unhealthy: 'Unhealthy',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: 24,
  border: '1px solid #e5e7eb',
};

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 };
const td: React.CSSProperties = { padding: '8px 10px' };

export default function ConsumerHealthPage() {
  const [statusFilter, setStatusFilter] = useState<HealthStatus | 'all'>('all');

  const scored = useMemo(() => scoreAllConsumers(SAMPLE_CONSUMERS), []);
  const alerts = useMemo(() => unhealthyAlerts(scored), [scored]);
  const avg = fleetAverage(scored);

  const visible = statusFilter === 'all' ? scored : scored.filter((c) => c.status === statusFilter);

  // Overall score per key, painted by status (a reserved state palette, not a series hue).
  const overallData = {
    labels: scored.map((c) => c.usage.name),
    datasets: [
      {
        label: 'Health score',
        data: scored.map((c) => c.score),
        backgroundColor: scored.map((c) => STATUS_COLORS[c.status]),
        borderRadius: 4,
      },
    ],
  };

  // Component breakdown: three sub-scores side by side per consumer.
  const breakdownData = {
    labels: scored.map((c) => c.usage.name),
    datasets: scored[0].components.map((comp, i) => ({
      label: `${comp.label} (${Math.round(SCORE_WEIGHTS[comp.key] * 100)}%)`,
      data: scored.map((c) => c.components[i].score),
      backgroundColor: SERIES[i],
      borderRadius: 4,
    })),
  };

  // Weekly request volume, indexed to week 1 so all consumers share one scale.
  const trendData = {
    labels: WEEK_LABELS,
    datasets: scored.slice(0, 4).map((c, i) => ({
      label: c.usage.name,
      data: c.usage.weeklyRequests.map((v) => Math.round((v / c.usage.weeklyRequests[0]) * 100)),
      borderColor: [...SERIES, '#dc2626'][i],
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 6,
    })),
  };

  const scoreAxis = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.92)',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const c = scored[item.dataIndex];
            return [`Score ${c.score} · grade ${c.grade}`, ...c.components.map((x) => `${x.label}: ${x.score}`)];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } },
        title: { display: true, text: 'Health score', color: '#6b7280', font: { size: 11 } },
      },
    },
  };

  const kpis = [
    { label: 'Consumers scored', value: String(scored.length) },
    { label: 'Fleet average score', value: String(avg) },
    { label: 'Unhealthy', value: String(scored.filter((c) => c.status === 'unhealthy').length) },
    { label: 'On watch', value: String(scored.filter((c) => c.status === 'watch').length) },
  ];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>API Consumer Health</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Every API key scored 0–100 on error rate ({Math.round(SCORE_WEIGHTS.errorRate * 100)}%), rate
          limit compliance ({Math.round(SCORE_WEIGHTS.rateLimit * 100)}%), and usage trend (
          {Math.round(SCORE_WEIGHTS.usageTrend * 100)}%). Below {UNHEALTHY_THRESHOLD} is unhealthy;
          below {WATCH_THRESHOLD} goes on watch.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div style={{ ...card, marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>
            Unhealthy consumer alerts ({alerts.length})
          </h3>
          {alerts.map((a) => {
            const critical = a.severity === 'critical';
            return (
              <div
                key={a.key}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  marginBottom: 8,
                  border: `1px solid ${critical ? '#fecaca' : '#fde68a'}`,
                  background: critical ? '#fef2f2' : '#fffbeb',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: '20px' }} aria-hidden>
                  {critical ? '⛔' : '⚠️'}
                </span>
                <div style={{ fontSize: 13, color: '#111827' }}>
                  <strong>
                    {a.name} — score {a.score} ({STATUS_LABEL[a.status]})
                  </strong>{' '}
                  <span style={{ color: '#6b7280' }}>· {a.owner}</span>
                  <div style={{ marginTop: 4, color: '#6b7280' }}>
                    Weakest component: <strong style={{ color: '#111827' }}>{a.worstComponent.label}</strong>{' '}
                    ({a.worstComponent.score}/100)
                  </div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#374151' }}>
                    {a.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Health score per API key</h3>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 12, color: '#6b7280' }}>
            {(['healthy', 'watch', 'unhealthy'] as HealthStatus[]).map((s) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[s] }}
                  aria-hidden
                />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <div style={{ height: 280 }}>
            <Bar data={overallData} options={scoreAxis} />
          </div>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Score components</h3>
          <div style={{ height: 316 }}>
            <Bar
              data={breakdownData}
              options={{
                ...scoreAxis,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    labels: { boxWidth: 12, boxHeight: 12, color: '#374151', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
          Usage trend — top 4 consumers
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          Weekly requests indexed to week 1 = 100, so growth shapes are comparable across very
          different traffic volumes.
        </p>
        <div style={{ height: 260 }}>
          <Line
            data={trendData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index' as const, intersect: false },
              plugins: {
                legend: {
                  position: 'top' as const,
                  labels: { boxWidth: 12, boxHeight: 2, color: '#374151', font: { size: 11 } },
                },
                tooltip: {
                  backgroundColor: 'rgba(17,24,39,0.92)',
                  padding: 10,
                  cornerRadius: 8,
                  callbacks: { label: (i: TooltipItem<'line'>) => `${i.dataset.label}: ${i.parsed.y} (index)` },
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 } } },
                y: {
                  grid: { color: 'rgba(0,0,0,0.05)' },
                  border: { display: false },
                  ticks: { color: '#6b7280', font: { size: 11 } },
                  title: { display: true, text: 'Indexed requests (W1 = 100)', color: '#6b7280', font: { size: 11 } },
                },
              },
            }}
          />
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scorecard</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['all', 'unhealthy', 'watch', 'healthy'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  background: statusFilter === s ? '#111827' : '#fff',
                  color: statusFilter === s ? '#fff' : '#374151',
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                <th style={th}>Consumer</th>
                <th style={th}>API key</th>
                <th style={th}>Tier</th>
                <th style={th}>Score</th>
                <th style={th}>Grade</th>
                <th style={th}>Errors</th>
                <th style={th}>429 rate</th>
                <th style={th}>Peak quota use</th>
                <th style={th}>8w trend</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.usage.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        marginRight: 8,
                        background: STATUS_COLORS[c.status],
                      }}
                      aria-hidden
                    />
                    {c.usage.name}
                    <div style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 16 }}>
                      {c.usage.owner}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: 'ui-monospace, monospace', color: '#6b7280' }}>
                    {c.usage.key}
                  </td>
                  <td style={td}>{c.usage.tier}</td>
                  <td style={{ ...td, fontWeight: 700, color: STATUS_COLORS[c.status] }}>{c.score}</td>
                  <td style={td}>{c.grade}</td>
                  <td style={td}>{c.usage.errorRatePct.toFixed(2)}%</td>
                  <td style={td}>{c.throttleRatePct}%</td>
                  <td style={{ ...td, color: c.quotaUtilizationPct >= 85 ? '#dc2626' : '#374151' }}>
                    {c.quotaUtilizationPct}%
                  </td>
                  <td style={{ ...td, color: c.trendPct < 0 ? '#dc2626' : '#15803d' }}>
                    {c.trendPct >= 0 ? '+' : ''}
                    {c.trendPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
