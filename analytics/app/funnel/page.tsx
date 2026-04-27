'use client';

import dynamic from 'next/dynamic';
import ChartSkeleton from '@/components/ui/ChartSkeleton';

const LazyUserFunnelChart = dynamic(
  () => import('@/components/charts/UserFunnelChart'),
  { loading: () => <ChartSkeleton /> },
);

const STAGES = [
  { label: 'Signup',       count: 12_400 },
  { label: 'Email Verify', count: 9_800 },
  { label: 'First Gist',   count: 6_200 },
  { label: 'Second Gist',  count: 3_900 },
  { label: 'Active User',  count: 2_100 },
];

export default function UserFunnelPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>User Cohort Funnel</h1>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        Conversion rates across the user journey from signup to active retention.
      </p>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {STAGES.map((s, i) => {
            const prev = STAGES[i - 1];
            const rate = prev ? ((s.count / prev.count) * 100).toFixed(1) : null;
            return (
              <div
                key={s.label}
                style={{
                  flex: '1 1 140px',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                  {s.count.toLocaleString()}
                </div>
                {rate && (
                  <div style={{ fontSize: 12, color: parseFloat(rate) < 60 ? '#ef4444' : '#6366f1', marginTop: 2 }}>
                    {rate}% from prev
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <LazyUserFunnelChart />
      </div>
    </main>
  );
}
