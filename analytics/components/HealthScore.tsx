'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { calcHealthScore, DEFAULT_COMPONENTS } from '@/lib/health-calc';
import type { ComponentHealth } from '@/lib/health-calc';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const STATUS_COLOR = { healthy: '#16a34a', warning: '#d97706', critical: '#dc2626' };
const STATUS_BG    = { healthy: '#dcfce7', warning: '#fef3c7', critical: '#fee2e2' };

interface ThresholdConfig { warning: number; critical: number }

export default function HealthScore() {
  const [thresholds, setThresholds] = useState<ThresholdConfig>({ warning: 80, critical: 60 });
  const result = useMemo(() => calcHealthScore(DEFAULT_COMPONENTS), []);

  const statusColor = STATUS_COLOR[result.status];
  const statusBg    = STATUS_BG[result.status];

  const chartData = {
    labels: result.history.map((h) => h.time),
    datasets: [{
      data: result.history.map((h) => h.score),
      borderColor: statusColor,
      backgroundColor: `${statusColor}18`,
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  };

  const chartOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (i: { raw: unknown }) => ` Score: ${i.raw}` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 6, font: { size: 11 } } },
      y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } }, border: { display: false } },
    },
  } as const;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Score gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: statusBg, border: `6px solid ${statusColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: statusColor, lineHeight: 1 }}>{result.score}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>/ 100</span>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Platform Health</div>
          <span style={{ display: 'inline-block', marginTop: 6, padding: '4px 12px', borderRadius: 20, background: statusBg, color: statusColor, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
            {result.status}
          </span>
          {/* Threshold config */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
            {(['warning', 'critical'] as const).map((k) => (
              <label key={k} style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ textTransform: 'capitalize' }}>{k} &lt;</span>
                <input
                  type="number" min={0} max={100}
                  value={thresholds[k]}
                  onChange={(e) => setThresholds((t) => ({ ...t, [k]: Number(e.target.value) }))}
                  style={{ width: 52, padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        {result.components.map((c) => {
          const cs = c.score >= thresholds.warning ? 'healthy' : c.score >= thresholds.critical ? 'warning' : 'critical';
          return (
            <div key={c.name} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{c.name}</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: STATUS_COLOR[cs] }}>{c.score}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>Uptime: {c.uptime.toFixed(1)}%</span>
                <span>Error rate: {c.errorRate.toFixed(1)}%</span>
                <span>Response: {c.responseTime}ms</span>
              </div>
              {/* mini bar */}
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginTop: 10 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${c.score}%`, background: STATUS_COLOR[cs], transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical trend */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>24-Hour Score Trend</h3>
        <Line data={chartData} options={chartOpts} />
      </div>
    </div>
  );
}

export type { ComponentHealth };
