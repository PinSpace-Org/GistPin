'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useState, useMemo } from 'react';
import { getAttributionSources, computeAttribution, getGrowthData, getCampaignEffectiveness, AttributionModel } from '@/lib/growth-attribution';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function GrowthAttributionPage() {
  const [model, setModel] = useState<AttributionModel>('linear');

  const sources = useMemo(() => getAttributionSources(), []);
  const result = useMemo(() => computeAttribution(sources, model), [sources, model]);
  const growthData = useMemo(() => getGrowthData(), []);
  const campaigns = useMemo(() => getCampaignEffectiveness(), []);

  const bySourceData = useMemo(() => ({
    labels: result.sources.map((s) => s.name),
    datasets: [
      {
        label: 'Attributed Conversions',
        data: result.sources.map((s) => s.attributedConversions),
        backgroundColor: result.sources.map((s) =>
          s.type === 'campaign' ? 'rgba(99,102,241,0.7)' :
          s.type === 'organic'  ? 'rgba(34,197,94,0.7)' :
          s.type === 'social'   ? 'rgba(245,158,11,0.7)' :
          s.type === 'referral' ? 'rgba(168,85,247,0.7)' :
                                  'rgba(239,68,68,0.7)'
        ),
        borderRadius: 4,
      },
    ],
  }), [result]);

  const pieData = useMemo(() => ({
    labels: ['Organic / Referral', 'Paid / Campaign'],
    datasets: [{
      data: [result.organicPct, result.paidPct],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(99,102,241,0.8)'],
    }],
  }), [result]);

  const growthChartData = useMemo(() => ({
    labels: growthData.map((g) => g.date),
    datasets: [
      {
        label: 'Organic',
        data: growthData.map((g) => g.organic),
        backgroundColor: 'rgba(34,197,94,0.7)',
        stack: 'stack',
        borderRadius: 2,
      },
      {
        label: 'Referral',
        data: growthData.map((g) => g.referral),
        backgroundColor: 'rgba(168,85,247,0.7)',
        stack: 'stack',
        borderRadius: 2,
      },
      {
        label: 'Paid',
        data: growthData.map((g) => g.paid),
        backgroundColor: 'rgba(99,102,241,0.7)',
        stack: 'stack',
        borderRadius: 2,
      },
    ],
  }), [growthData]);

  const campaignBarData = useMemo(() => ({
    labels: campaigns.map((c) => c.campaign),
    datasets: [
      {
        label: 'Contributors',
        data: campaigns.map((c) => c.contributors),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 4,
      },
      {
        label: 'PRs Merged',
        data: campaigns.map((c) => c.prsMerged),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 4,
      },
    ],
  }), [campaigns]);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Contributor Growth Attribution</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Attribute platform contributor growth to specific campaigns, channels, and organic sources.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', padding: '8px 0' }}>Attribution Model:</span>
        {(['first-touch', 'last-touch', 'linear', 'time-decay'] as AttributionModel[]).map((m) => (
          <button
            key={m}
            onClick={() => setModel(m)}
            style={{
              padding: '6px 14px', borderRadius: 999, border: '1px solid',
              borderColor: model === m ? '#6366f1' : '#d1d5db',
              background: model === m ? '#6366f1' : 'transparent',
              color: model === m ? '#fff' : '#374151',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Conversions', value: result.totalConversions.toString() },
          { label: 'Total Revenue',     value: `$${result.totalRevenue.toLocaleString()}` },
          { label: 'Organic %',         value: `${result.organicPct}%` },
          { label: 'Paid %',            value: `${result.paidPct}%` },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Conversions by Source ({model.replace('-', ' ')})</h3>
          <Bar data={bySourceData} options={{
            responsive: true,
            indexAxis: 'y' as const,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, title: { display: true, text: 'Conversions' } } },
          }} height={200} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Organic vs Paid Split</h3>
          <div style={{ maxWidth: 260, margin: '0 auto' }}>
            <Pie data={pieData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
            }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Growth Trend (Weekly)</h3>
        <Bar data={growthChartData} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'New Contributors' } } },
        }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Campaign Effectiveness</h3>
        <Bar data={campaignBarData} options={{
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } },
        }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Attribution Source Details</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Source</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Type</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Touches</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Converted</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Conversion Rate</th>
                <th style={{ padding: '8px 10px', color: '#6b7280' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {result.sources.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '10px', textTransform: 'capitalize' }}>{s.type}</td>
                  <td style={{ padding: '10px' }}>{s.touches}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{s.attributedConversions.toFixed(1)}</td>
                  <td style={{ padding: '10px' }}>{((s.attributedConversions / s.touches) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '10px', fontWeight: 700 }}>${s.attributedRevenue.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
