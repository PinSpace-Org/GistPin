'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const endpoints = [
  { name: 'GET /gists',         requests: 48210, growth: 12.4, avgMs: 145 },
  { name: 'GET /feed',          requests: 39870, growth:  8.1, avgMs: 167 },
  { name: 'GET /health',        requests: 35100, growth:  2.0, avgMs:  12 },
  { name: 'GET /gists/:id',     requests: 28430, growth:  5.7, avgMs:  98 },
  { name: 'GET /users/me',      requests: 22910, growth:  9.3, avgMs:  55 },
  { name: 'GET /locations',     requests: 19540, growth:  6.8, avgMs:  88 },
  { name: 'POST /auth/login',   requests: 14320, growth: -1.2, avgMs: 320 },
  { name: 'POST /gists',        requests: 11870, growth: 14.5, avgMs: 210 },
  { name: 'GET /search',        requests:  9210, growth: 22.3, avgMs: 134 },
  { name: 'GET /notifications', requests:  8760, growth:  3.4, avgMs:  72 },
  { name: 'POST /tips',         requests:  6540, growth: 18.9, avgMs: 195 },
  { name: 'GET /map/pins',      requests:  5980, growth:  7.2, avgMs: 112 },
  { name: 'PUT /gists/:id',     requests:  4320, growth: -0.5, avgMs: 188 },
  { name: 'GET /trending',      requests:  3870, growth: 31.2, avgMs: 201 },
  { name: 'POST /reports',      requests:  2940, growth:  4.1, avgMs: 245 },
  { name: 'GET /tags',          requests:  2510, growth:  1.8, avgMs:  64 },
  { name: 'DELETE /gists/:id',  requests:  1870, growth: -2.3, avgMs: 180 },
  { name: 'GET /leaderboard',   requests:  1540, growth: 11.7, avgMs: 156 },
  { name: 'POST /auth/refresh', requests:  1230, growth:  0.9, avgMs:  89 },
  { name: 'GET /settings',      requests:   980, growth:  2.5, avgMs:  43 },
];

export default function EndpointRanking() {
  const [selected, setSelected] = useState<string | null>(null);
  const detail = selected ? endpoints.find((e) => e.name === selected) : null;

  const data = {
    labels: endpoints.map((e) => e.name),
    datasets: [
      {
        label: 'Requests',
        data: endpoints.map((e) => e.requests),
        backgroundColor: endpoints.map((e) =>
          e.growth >= 10
            ? 'rgba(34, 197, 94, 0.8)'
            : e.growth < 0
            ? 'rgba(239, 68, 68, 0.8)'
            : 'rgba(99, 102, 241, 0.8)',
        ),
        borderRadius: 3,
        barPercentage: 0.85,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const ep = endpoints[item.dataIndex];
            return [
              `  Requests: ${(item.raw as number).toLocaleString()}`,
              `  Growth: ${ep.growth > 0 ? '+' : ''}${ep.growth}%`,
              `  Avg response: ${ep.avgMs} ms`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11 } },
        title: { display: true, text: 'Request count', color: '#6b7280', font: { size: 12 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#374151', font: { size: 11 } },
      },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) {
        setSelected(endpoints[elements[0].index].name);
      }
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          {[
            { color: 'bg-green-500', label: 'High growth (≥10%)' },
            { color: 'bg-indigo-500', label: 'Stable' },
            { color: 'bg-red-500',   label: 'Declining' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-gray-500">
              <span className={`inline-block w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
        <ExportButton
          onExport={(onProgress) =>
            exportRowsToCsv({
              filenamePrefix: 'endpoint-ranking',
              rows: endpoints.map((e) => ({
                endpoint: e.name,
                requests: e.requests,
                growth_pct: e.growth,
                avg_response_ms: e.avgMs,
              })),
              onProgress,
            })
          }
        />
      </div>

      <div style={{ height: 520 }}>
        <Bar data={data} options={{ ...options, maintainAspectRatio: false }} />
      </div>

      {detail && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 font-mono">{detail.name}</h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              ✕ close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total requests</p>
              <p className="text-xl font-bold">{detail.requests.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Growth</p>
              <p className={`text-xl font-bold ${detail.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {detail.growth > 0 ? '+' : ''}{detail.growth}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Avg response</p>
              <p className="text-xl font-bold">{detail.avgMs} ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
