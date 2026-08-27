'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

interface ConfirmationSample {
  ledger: number;
  closeTimeMs: number;
}

const RAW_DATA: ConfirmationSample[] = Array.from({ length: 100 }, (_, i) => ({
  ledger: 900000 + i,
  closeTimeMs: Math.round(3000 + Math.sin(i / 8) * 1200 + Math.random() * 800),
}));

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export default function ConfirmationPercentiles() {
  const { histogram, percentiles, trend } = useMemo(() => {
    const times = RAW_DATA.map(d => d.closeTimeMs).sort((a, b) => a - b);
    const p50 = percentile(times, 50);
    const p95 = percentile(times, 95);
    const p99 = percentile(times, 99);

    const buckets = [0, 2000, 3000, 4000, 5000, 6000, 8000];
    const counts = buckets.slice(0, -1).map((_, i) =>
      times.filter(t => t >= buckets[i] && t < buckets[i + 1]).length
    );

    const trend = RAW_DATA.map(d => ({ ledger: d.ledger, time: d.closeTimeMs }));
    return { histogram: { labels: buckets.slice(0, -1).map((b, i) => `${b / 1000}-${buckets[i + 1] / 1000}s`), counts }, percentiles: { p50, p95, p99 }, trend };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 20 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Confirmation Time Distribution</h2>
        <Bar data={{ labels: histogram.labels, datasets: [{ label: 'Count', data: histogram.counts, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4 }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Percentiles</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[['P50', percentiles.p50], ['P95', percentiles.p95], ['P99', percentiles.p99]].map(([label, val]) => (
            <div key={label as string} style={{ flex: 1, textAlign: 'center', padding: 16, borderRadius: 14, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{(val / 1000).toFixed(1)}s</div>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: 18 }}>Trend Over Ledger Sequence</h2>
        <Line data={{ labels: trend.map(d => d.ledger), datasets: [{ label: 'Close Time (ms)', data: trend.map(d => d.time), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3, fill: true, pointRadius: 1 }] }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 10 } } } }} />
      </div>
    </div>
  );
}
