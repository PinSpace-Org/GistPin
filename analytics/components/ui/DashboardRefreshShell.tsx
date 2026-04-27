'use client';

import ScatterChart from '@/components/charts/ScatterChart';
import RadarChart from '@/components/charts/RadarChart';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import LocationTable from '@/components/ui/LocationTable';
import LiveGistCounter from '@/components/LiveGistCounter';
import UserAreaChart from '@/components/charts/UserAreaChart';
import RefreshIndicator from '@/components/RefreshIndicator';

export default function DashboardRefreshShell() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 64px' }}>
      <section
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)',
          borderRadius: 26,
          padding: '28px 30px',
          boxShadow: '0 18px 46px rgba(15,23,42,0.08)',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '6px 12px',
            background: '#1d4ed8',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          Dashboard Refresh
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 38, lineHeight: 1.05 }}>Analytics Dashboard</h1>

        <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 16, maxWidth: 680 }}>
          Monitor the latest dashboard update time and refresh the current analytics view on demand
          or automatically every five minutes.
        </p>

        <RefreshIndicator />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Live Gists</h2>
        <LiveGistCounter />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>New vs Returning Users (90 days)</h2>
        <UserAreaChart />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Scatter</h2>
        <ScatterChart />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Radar</h2>
        <RadarChart />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Category Distribution</h2>
        <CategoryPieChart />
      </section>

      <section>
        <h2>Locations</h2>
        <LocationTable />
      </section>
    </main>
  );
}
