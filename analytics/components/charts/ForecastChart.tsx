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
import { generateHistoricalData, generateForecast } from '@/lib/forecast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function ForecastChart() {
  const [showForecast, setShowForecast] = useState(true);

  const historical = useMemo(() => generateHistoricalData(30), []);
  const { forecast, upperBound, lowerBound, r2 } = useMemo(
    () => generateForecast(historical, 7, 0.2),
    [historical]
  );

  const allLabels = [...historical.map((p) => p.label), ...forecast.map((p) => p.label)];
  const histPad = [...historical.map((p) => p.value), ...Array(7).fill(null)];
  const lastHistVal = historical[historical.length - 1].value;

  const forecastPad = showForecast
    ? [...Array(historical.length - 1).fill(null), lastHistVal, ...forecast.map((p) => p.value)]
    : [];
  const upperPad = showForecast
    ? [...Array(historical.length - 1).fill(null), lastHistVal, ...upperBound.map((p) => p.value)]
    : [];
  const lowerPad = showForecast
    ? [...Array(historical.length - 1).fill(null), lastHistVal, ...lowerBound.map((p) => p.value)]
    : [];

  const data = {
    labels: allLabels,
    datasets: [
      {
        label: 'Historical',
        data: histPad,
        borderColor: 'rgba(99,102,241,0.9)',
        borderWidth: 2.5,
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        spanGaps: false,
      },
      ...(showForecast
        ? [
            {
              label: 'Upper bound',
              data: upperPad,
              borderColor: 'transparent',
              backgroundColor: 'rgba(99,102,241,0.12)',
              fill: '+1',
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 0,
              spanGaps: false,
            },
            {
              label: 'Forecast',
              data: forecastPad,
              borderColor: 'rgba(251,146,60,0.9)',
              borderWidth: 2,
              borderDash: [6, 4],
              backgroundColor: 'transparent',
              fill: false,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              spanGaps: false,
            },
            {
              label: 'Lower bound',
              data: lowerPad,
              borderColor: 'transparent',
              backgroundColor: 'rgba(99,102,241,0.12)',
              fill: '-2',
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 0,
              spanGaps: false,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          color: '#9ca3af',
          font: { size: 11 },
          callback: (_: unknown, i: number) =>
            i % 5 === 0 || i === allLabels.length - 1 ? allLabels[i] : null,
        },
        border: { color: '#e5e7eb' },
      },
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#c7d2fe',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        filter: (item: TooltipItem<'line'>) =>
          item.dataset.label !== 'Upper bound' && item.dataset.label !== 'Lower bound',
      },
    },
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          R² score: <strong style={{ color: '#6366f1' }}>{r2.toFixed(3)}</strong>
          <span style={{ marginLeft: 16 }}>Confidence interval: ±20%</span>
        </div>
        <button
          onClick={() => setShowForecast((v) => !v)}
          style={{
            fontSize: 12,
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid #6366f1',
            background: showForecast ? '#6366f1' : 'transparent',
            color: showForecast ? '#fff' : '#6366f1',
            cursor: 'pointer',
          }}
        >
          {showForecast ? 'Hide Forecast' : 'Show Forecast'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12, color: '#6b7280' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 20, height: 2, background: 'rgba(99,102,241,0.9)', display: 'inline-block' }} />
          Historical
        </span>
        {showForecast && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 20,
                height: 2,
                background: 'rgba(251,146,60,0.9)',
                display: 'inline-block',
                borderTop: '2px dashed rgba(251,146,60,0.9)',
              }}
            />
            7-day forecast
          </span>
        )}
      </div>
      <Line data={data} options={options} />
    </div>
  );
}
