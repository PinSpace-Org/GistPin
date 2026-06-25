'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getWalletScores, getScoreDistribution, getTierBreakdown, getEngagementScoreColor } from '@/lib/engagement-score';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function WalletScoresPage() {
  const wallets = getWalletScores();
  const dist = getScoreDistribution();
  const tiers = getTierBreakdown();

  const distData = {
    labels: dist.map((d) => d.range),
    datasets: [{
      label: 'Wallets',
      data: dist.map((d) => d.count),
      backgroundColor: dist.map((d) => {
        const num = parseInt(d.range.split('-')[0]);
        return getEngagementScoreColor(num);
      }),
      borderRadius: 3,
    }],
  };

  const tierData = {
    labels: tiers.map((t) => t.tier),
    datasets: [{
      label: 'Wallets',
      data: tiers.map((t) => t.count),
      backgroundColor: ['#6366f1', '#f59e0b', '#94a3b8', '#cd7f32', '#6b7280'],
      borderRadius: 3,
    }],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Wallet Engagement Scores</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Scoring and tiering wallets by tip activity, content quality, and consistency.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Wallets',       value: '462' },
          { label: 'Platinum Wallets',    value: '42' },
          { label: 'Avg Engagement Score', value: '66' },
          { label: 'Top Tier Threshold',   value: '90+' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Score Distribution</h3>
          <Bar data={distData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={80} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Tier Breakdown</h3>
          <Bar data={tierData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={80} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Wallet Leaderboard</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Wallet</th>
              <th style={{ padding: '6px 10px' }}>Engagement</th>
              <th style={{ padding: '6px 10px' }}>Tip Activity</th>
              <th style={{ padding: '6px 10px' }}>Content Quality</th>
              <th style={{ padding: '6px 10px' }}>Consistency</th>
              <th style={{ padding: '6px 10px' }}>Total Gists</th>
              <th style={{ padding: '6px 10px' }}>Avg Tip</th>
              <th style={{ padding: '6px 10px' }}>Top Category</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.wallet} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{w.wallet}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 8,
                    fontWeight: 600,
                    background: `${getEngagementScoreColor(w.engagementScore)}22`,
                    color: getEngagementScoreColor(w.engagementScore),
                  }}>
                    {w.engagementScore}
                  </span>
                </td>
                <td style={{ padding: '6px 10px' }}>{w.tipActivity}/100</td>
                <td style={{ padding: '6px 10px' }}>{w.contentQuality}/100</td>
                <td style={{ padding: '6px 10px' }}>{w.consistency}/100</td>
                <td style={{ padding: '6px 10px' }}>{w.totalGists}</td>
                <td style={{ padding: '6px 10px' }}>{w.avgTip} XLM</td>
                <td style={{ padding: '6px 10px' }}>{w.topCategory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
