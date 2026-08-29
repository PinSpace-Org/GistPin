'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import {
  DEFAULT_CAPACITY_THRESHOLDS,
  EVENT_STREAMS,
  forecastEventVolume,
  formatEvents,
  generateEventVolumeHistory,
  type ConfidenceLevel,
} from '@/lib/volume-forecaster';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const HISTORY_DAYS = 90;
const FORECAST_DAYS = 30;

const SERIES_HISTORICAL = '#6366f1';
const SERIES_FORECAST = '#f59e0b';
const BAND = 'rgba(99,102,241,0.14)';
const WARNING = '#b45309';
const CRITICAL = '#dc2626';

const CONFIDENCE_OPTIONS: ConfidenceLevel[] = [80, 90, 95];

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
};

export default function EventVolumeForecaster() {
  const [streamId, setStreamId] = useState(EVENT_STREAMS[0].id);
  const [confidence, setConfidence] = useState<ConfidenceLevel>(95);
  const [showThresholds, setShowThresholds] = useState(true);

  const stream = EVENT_STREAMS.find((s) => s.id === streamId) ?? EVENT_STREAMS[0];

  const historical = useMemo(() => generateEventVolumeHistory(stream, HISTORY_DAYS), [stream]);
  const result = useMemo(
    () =>
      forecastEventVolume(historical, {
        days: FORECAST_DAYS,
        confidence,
        thresholds: DEFAULT_CAPACITY_THRESHOLDS,
      }),
    [historical, confidence]
  );

  const { forecast, model, alerts, thresholds } = result;

  const labels = [...historical.map((p) => p.label), ...forecast.map((p) => p.label)];
  const histLen = historical.length;
  const lastHist = historical[histLen - 1].value;
  // Repeat the last observed value at the seam so the forecast connects to history.
  const pad = Array(histLen - 1).fill(null);

  const data = {
    labels,
    datasets: [
      {
        label: 'Historical',
        data: [...historical.map((p) => p.value), ...Array(FORECAST_DAYS).fill(null)],
        borderColor: SERIES_HISTORICAL,
        backgroundColor: 'rgba(99,102,241,0.06)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: `Lower bound (${confidence}%)`,
        data: [...pad, lastHist, ...forecast.map((p) => p.lower)],
        borderColor: 'transparent',
        backgroundColor: BAND,
        borderWidth: 0,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: `Upper bound (${confidence}%)`,
        data: [...pad, lastHist, ...forecast.map((p) => p.upper)],
        borderColor: 'transparent',
        backgroundColor: BAND,
        borderWidth: 0,
        fill: '-1',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Forecast',
        data: [...pad, lastHist, ...forecast.map((p) => p.value)],
        borderColor: SERIES_FORECAST,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      ...(showThresholds
        ? thresholds.map((t) => ({
            label: t.name,
            data: Array(labels.length).fill(t.limit),
            borderColor: t.severity === 'critical' ? CRITICAL : WARNING,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [2, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0,
          }))
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#e5e7eb' },
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          color: '#6b7280',
          font: { size: 11 },
          callback: (_: unknown, i: number) =>
            i % 10 === 0 || i === histLen - 1 || i === labels.length - 1 ? labels[i] : null,
        },
      },
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: (v: string | number) => formatEvents(Number(v)),
        },
        title: { display: true, text: 'Events / day', color: '#6b7280', font: { size: 11 } },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: { boxWidth: 12, boxHeight: 2, usePointStyle: false, color: '#374151', font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.92)',
        titleColor: '#f9fafb',
        bodyColor: '#e5e7eb',
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        filter: (item: TooltipItem<'line'>) => item.parsed.y !== null,
        callbacks: {
          label: (item: TooltipItem<'line'>) =>
            `${item.dataset.label}: ${Number(item.parsed.y).toLocaleString()}`,
        },
      },
    },
  };

  const kpis = [
    { label: 'Current daily avg (7d)', value: result.currentDailyAvg.toLocaleString(), hint: 'events/day' },
    {
      label: `Day ${FORECAST_DAYS} projection`,
      value: result.projectedDailyAvg.toLocaleString(),
      hint: `${result.growthPct >= 0 ? '+' : ''}${result.growthPct}% vs today`,
    },
    { label: `Peak upper bound (${confidence}%)`, value: result.peakUpper.toLocaleString(), hint: 'plan headroom for this' },
    { label: 'Trend fit (R²)', value: model.r2.toFixed(3), hint: `σ ${Math.round(model.sigma).toLocaleString()} events` },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          Event stream
          <select value={streamId} onChange={(e) => setStreamId(e.target.value)} style={selectStyle}>
            {EVENT_STREAMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.topic}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          Confidence
          <select
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value) as ConfidenceLevel)}
            style={selectStyle}
          >
            {CONFIDENCE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}%
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setShowThresholds((v) => !v)}
          style={{
            ...selectStyle,
            cursor: 'pointer',
            border: `1px solid ${SERIES_HISTORICAL}`,
            background: showThresholds ? SERIES_HISTORICAL : '#fff',
            color: showThresholds ? '#fff' : SERIES_HISTORICAL,
          }}
        >
          {showThresholds ? 'Hide capacity thresholds' : 'Show capacity thresholds'}
        </button>
        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
          {stream.contract} · {HISTORY_DAYS}d history · {FORECAST_DAYS}d forecast
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{k.hint}</div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((a) => {
            const critical = a.severity === 'critical';
            return (
              <div
                key={a.threshold}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
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
                  <strong>{critical ? 'Critical' : 'Warning'} — {a.threshold}</strong> is forecast to be
                  breached in <strong>{a.horizonDays} days</strong> ({a.label}).{' '}
                  {a.bound === 'expected'
                    ? 'The expected volume'
                    : `The ${confidence}% upper bound`}{' '}
                  reaches {a.projected.toLocaleString()} events/day against a limit of{' '}
                  {a.limit.toLocaleString()} ({a.utilizationPct}% utilization).
                </div>
              </div>
            );
          })}
        </div>
      )}
      {alerts.length === 0 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            marginBottom: 20,
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            fontSize: 13,
            color: '#111827',
          }}
        >
          <span aria-hidden>✅</span> No capacity threshold is breached inside the {FORECAST_DAYS}-day
          window at {confidence}% confidence.
        </div>
      )}

      <div style={{ height: 340 }}>
        <Line data={data} options={options} />
      </div>

      <h4 style={{ margin: '28px 0 10px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
        Capacity headroom
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={{ padding: '8px 10px' }}>Threshold</th>
            <th style={{ padding: '8px 10px' }}>Limit (events/day)</th>
            <th style={{ padding: '8px 10px' }}>Utilization today</th>
            <th style={{ padding: '8px 10px' }}>Days to breach</th>
            <th style={{ padding: '8px 10px' }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {thresholds.map((t) => {
            const alert = alerts.find((a) => a.threshold === t.name);
            const utilNow = Math.round((result.currentDailyAvg / t.limit) * 1000) / 10;
            return (
              <tr key={t.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#111827' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      marginRight: 8,
                      background: t.severity === 'critical' ? CRITICAL : WARNING,
                    }}
                    aria-hidden
                  />
                  {t.name}
                </td>
                <td style={{ padding: '8px 10px' }}>{t.limit.toLocaleString()}</td>
                <td style={{ padding: '8px 10px' }}>{utilNow}%</td>
                <td
                  style={{
                    padding: '8px 10px',
                    fontWeight: 600,
                    color: alert ? (alert.severity === 'critical' ? CRITICAL : WARNING) : '#15803d',
                  }}
                >
                  {alert ? `${alert.horizonDays} d (${alert.bound})` : `> ${FORECAST_DAYS} d`}
                </td>
                <td style={{ padding: '8px 10px', color: '#6b7280' }}>{t.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
