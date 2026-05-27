'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const events = [
  {
    name: 'gist_created',
    count: 14320,
    trend: [1800, 2100, 1950, 2300, 2050, 1700, 2420],
    properties: [
      { key: 'length_bucket', values: { short: 5210, medium: 6840, long: 2270 } },
      { key: 'has_location',  values: { true: 11430, false: 2890 } },
    ],
  },
  {
    name: 'gist_viewed',
    count: 48760,
    trend: [6200, 7100, 6800, 7400, 7200, 6500, 7560],
    properties: [
      { key: 'source',   values: { map: 28410, feed: 14320, search: 6030 } },
      { key: 'platform', values: { web: 31200, mobile: 17560 } },
    ],
  },
  {
    name: 'tip_sent',
    count: 3210,
    trend: [380, 450, 420, 510, 480, 390, 580],
    properties: [
      { key: 'amount_xlm', values: { '0.1': 1240, '0.5': 980, '1.0': 640, '5.0': 350 } },
    ],
  },
  {
    name: 'map_panned',
    count: 29840,
    trend: [3800, 4200, 3900, 4500, 4300, 4100, 5040],
    properties: [
      { key: 'direction', values: { north: 7210, south: 6980, east: 8140, west: 7510 } },
    ],
  },
  {
    name: 'search_performed',
    count: 9120,
    trend: [1100, 1300, 1200, 1400, 1350, 1100, 1670],
    properties: [
      { key: 'result_count', values: { '0': 1230, '1-5': 3410, '6-20': 3280, '20+': 1200 } },
    ],
  },
  {
    name: 'user_signed_up',
    count: 1840,
    trend: [210, 280, 250, 310, 290, 200, 300],
    properties: [
      { key: 'method', values: { email: 1120, wallet: 720 } },
    ],
  },
];

// Funnel steps
const funnelSteps = [
  { label: 'Map viewed',      count: 48760 },
  { label: 'Gist opened',     count: 29840 },
  { label: 'Gist created',    count: 14320 },
  { label: 'Tip sent',        count:  3210 },
];

export default function EventsPage() {
  const [selected, setSelected] = useState(events[0].name);
  const ev = events.find((e) => e.name === selected)!;

  const trendData = {
    labels: days,
    datasets: [{
      label: ev.name,
      data: ev.trend,
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.3,
      fill: true,
      pointRadius: 4,
    }],
  };

  const funnelData = {
    labels: funnelSteps.map((s) => s.label),
    datasets: [{
      label: 'Users',
      data: funnelSteps.map((s) => s.count),
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(59,130,246,0.8)', 'rgba(34,197,94,0.8)', 'rgba(251,191,36,0.8)'],
      borderRadius: 4,
    }],
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#ffffff 0%,#eef2ff 100%)',
        borderRadius: 24, padding: '28px 28px 24px',
        boxShadow: '0 12px 40px rgba(15,23,42,0.07)', marginBottom: 28,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', borderRadius: 999,
          padding: '5px 12px', background: '#6366f1', color: '#fff',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Custom Events</div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800 }}>Event Tracking Dashboard</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
              Monitor custom events, trends, and property breakdowns across your platform.
            </p>
          </div>
          <ExportButton
            onExport={(onProgress) =>
              exportRowsToCsv({
                filenamePrefix: 'custom-events',
                rows: events.map((e) => ({ event: e.name, total_count: e.count })),
                onProgress,
              })
            }
          />
        </div>
      </div>

      {/* Event count cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {events.map((e) => (
          <button
            key={e.name}
            type="button"
            onClick={() => setSelected(e.name)}
            className={`rounded-xl border p-3 text-left transition-all ${
              selected === e.name
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950 shadow-md'
                : 'border-gray-200 bg-white dark:bg-gray-900 hover:border-indigo-300'
            }`}
          >
            <p className="text-xs text-gray-500 font-mono truncate">{e.name}</p>
            <p className="text-xl font-bold mt-1">{e.count.toLocaleString()}</p>
          </button>
        ))}
      </div>

      {/* Trend chart for selected event */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">
            Trend — <span className="font-mono text-indigo-600">{ev.name}</span>
          </h2>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>

        {/* Properties breakdown */}
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Properties breakdown</h2>
          <div className="space-y-5">
            {ev.properties.map((prop) => {
              const total = Object.values(prop.values).reduce((s, v) => s + v, 0);
              return (
                <div key={prop.key}>
                  <p className="text-xs font-mono text-gray-500 mb-2">{prop.key}</p>
                  <div className="space-y-1">
                    {Object.entries(prop.values).map(([val, cnt]) => (
                      <div key={val} className="flex items-center gap-2 text-sm">
                        <span className="w-20 truncate text-gray-600">{val}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${(cnt / total) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-gray-500">{((cnt / total) * 100).toFixed(0)}%</span>
                        <span className="w-14 text-right font-medium">{cnt.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Funnel builder */}
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Funnel builder</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Bar
              data={funnelData}
              options={{
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { title: { display: true, text: 'Users' } } },
              }}
            />
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const prev = funnelSteps[i - 1];
              const rate = prev ? ((step.count / prev.count) * 100).toFixed(1) : null;
              return (
                <div key={step.label} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{step.label}</p>
                    {rate && (
                      <p className={`text-xs mt-0.5 ${parseFloat(rate) < 50 ? 'text-red-500' : 'text-green-600'}`}>
                        {rate}% conversion from previous
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold">{step.count.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
