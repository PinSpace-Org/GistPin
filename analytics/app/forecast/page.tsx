'use client';

import ForecastChart from '@/components/charts/ForecastChart';

export default function ForecastPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Gist Creation Forecast</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          30-day historical trend with 7-day linear regression forecast and ±20% confidence interval.
        </p>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <ForecastChart />
      </div>
    </main>
  );
}
