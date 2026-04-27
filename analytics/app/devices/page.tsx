'use client';

import DeviceBreakdown from '../../components/charts/DeviceBreakdown';

export default function DevicesPage() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Device &amp; Browser Breakdown</h1>
        <p style={{ margin: 0, color: '#475569' }}>Device types, browser versions, OS distribution, and mobile vs desktop trends.</p>
      </div>
      <DeviceBreakdown />
    </main>
  );
}
