'use client';

import CampaignDashboard from '@/components/CampaignDashboard';

export default function GrantFoxMetricsPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>GrantFox Campaign Metrics</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Track contributor performance, PR quality trends, and campaign ROI for the GrantFox funding initiative.
        </p>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <CampaignDashboard />
      </div>
    </main>
  );
}
