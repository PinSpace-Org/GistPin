'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useState, useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type MetricTab = 'overview' | 'quality' | 'roi';

interface Contributor {
  rank: number;
  login: string;
  prsMerged: number;
  issuesClosed: number;
  avgQuality: number;
  reward: number;
}

const PR_QUALITY_TREND = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
const QUALITY_SCORES = [72, 75, 78, 82, 79, 85, 88, 91];
const SUBMISSION_RATES = [45, 52, 48, 61, 58, 67, 72, 78];

const LEADERBOARD: Contributor[] = [
  { rank: 1, login: 'dev-stellar',   prsMerged: 24, issuesClosed: 18, avgQuality: 92, reward: 450 },
  { rank: 2, login: 'crypto-pixel',  prsMerged: 19, issuesClosed: 14, avgQuality: 88, reward: 320 },
  { rank: 3, login: 'soroban-mike',  prsMerged: 16, issuesClosed: 12, avgQuality: 85, reward: 280 },
  { rank: 4, login: 'gist-hunter',   prsMerged: 14, issuesClosed:  9, avgQuality: 79, reward: 240 },
  { rank: 5, login: 'tx-builder',    prsMerged: 12, issuesClosed: 11, avgQuality: 83, reward: 200 },
];

const CAMPAIGN_METRICS = [
  { label: 'Total Applicants',     value: '187', change: '+23%' },
  { label: 'Active Contributors',  value: '42',  change: '+12%' },
  { label: 'Issues Completed',     value: '156', change: '+18%' },
  { label: 'Avg PR Quality',       value: '91%', change: '+5%' },
  { label: 'Total Rewards Paid',   value: '$12,450', change: '+31%' },
  { label: 'Campaign ROI',         value: '3.2x',  change: '+0.4x' },
];

const COMPLETION_DATA = [
  { label: 'Bug Fixes',        completed: 42, total: 48 },
  { label: 'Feature Requests', completed: 28, total: 36 },
  { label: 'Documentation',    completed: 35, total: 40 },
  { label: 'Tests',            completed: 51, total: 56 },
];

export default function CampaignDashboard() {
  const [tab, setTab] = useState<MetricTab>('overview');

  const completionChart = useMemo(() => ({
    labels: COMPLETION_DATA.map((d) => d.label),
    datasets: [
      {
        label: 'Completed',
        data: COMPLETION_DATA.map((d) => d.completed),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Total',
        data: COMPLETION_DATA.map((d) => d.total),
        backgroundColor: 'rgba(99,102,241,0.3)',
        borderRadius: 4,
      },
    ],
  }), []);

  const qualityChart = useMemo(() => ({
    labels: PR_QUALITY_TREND,
    datasets: [
      {
        label: 'PR Quality Score',
        data: QUALITY_SCORES,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  }), []);

  const submissionChart = useMemo(() => ({
    labels: PR_QUALITY_TREND,
    datasets: [
      {
        label: 'Submissions',
        data: SUBMISSION_RATES,
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderRadius: 4,
      },
    ],
  }), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['overview', 'quality', 'roi'] as MetricTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: tab === t ? '#6366f1' : '#d1d5db',
              background: tab === t ? '#6366f1' : 'transparent',
              color: tab === t ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'roi' ? 'ROI' : t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {CAMPAIGN_METRICS.map((m) => (
          <div key={m.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{m.value}</div>
            <div style={{ fontSize: 12, color: m.change.startsWith('+') ? '#22c55e' : '#ef4444', fontWeight: 600, marginTop: 2 }}>{m.change} vs last period</div>
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Issue Completion Rate</h3>
            <Bar data={completionChart} options={{
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
            }} height={80} />
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Contributor Leaderboard</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>Contributor</th>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>PRs Merged</th>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>Issues Closed</th>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>Quality</th>
                  <th style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600 }}>Reward</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((c) => (
                  <tr key={c.login} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: c.rank <= 3 ? '#6366f1' : '#6b7280' }}>{c.rank}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{c.login}</td>
                    <td style={{ padding: '10px 10px' }}>{c.prsMerged}</td>
                    <td style={{ padding: '10px 10px' }}>{c.issuesClosed}</td>
                    <td style={{ padding: '10px 10px', color: c.avgQuality >= 85 ? '#22c55e' : '#b45309', fontWeight: 600 }}>{c.avgQuality}%</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>${c.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'quality' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>PR Quality Score Trend</h3>
            <Line data={qualityChart} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } } },
            }} />
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Weekly Submissions</h3>
            <Bar data={submissionChart} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
            }} />
          </div>
        </div>
      )}

      {tab === 'roi' && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Campaign ROI Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Total Invested', value: '$12,450' },
              { label: 'Estimated Value', value: '$39,840' },
              { label: 'Net Return',      value: '$27,390' },
              { label: 'ROI Multiple',    value: '3.2x' },
            ].map((r) => (
              <div key={r.label} style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{r.value}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            Based on estimated value of $400 per completed issue and $600 per merged PR across 156 completed issues and 85 merged PRs.
          </p>
        </div>
      )}
    </div>
  );
}
