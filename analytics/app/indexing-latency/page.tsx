'use client';

import IndexLatency from '@/components/charts/IndexLatency';

export default function IndexingLatencyPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Time-to-Index Latency Tracker</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Monitor Soroban submission-to-API latency with percentile breakdowns, SLA targets, and outlier detection.
        </p>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <IndexLatency />
      </div>
    </main>
  );
}
