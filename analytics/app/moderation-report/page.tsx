'use client';

import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const KPI_CARDS = [
  { label: 'Total Gists Reviewed', value: '12,847' },
  { label: 'Auto-Mod Hit Rate',    value: '89.3%' },
  { label: 'False Positive Rate',  value: '3.2%' },
  { label: 'Avg Review Time',      value: '1.4 sec' },
];

const ACTION_BREAKDOWN = [
  { action: 'Approved — Safe',      count: 8240, pct: 64, color: '#22c55e' },
  { action: 'Action — Flagged',     count: 3100, pct: 24, color: '#eab308' },
  { action: 'Blocked — Violation',  count: 1200, pct: 9,  color: '#ef4444' },
  { action: 'Escalated — Human',    count: 307,  pct: 3,  color: '#a855f7' },
];

const KEYWORD_RANKING = [
  { keyword: 'scam',      matches: 890,  action: 'block' },
  { keyword: 'spam',      matches: 750,  action: 'flag'  },
  { keyword: 'nsfw',      matches: 520,  action: 'block' },
  { keyword: 'violence',  matches: 340,  action: 'block' },
  { keyword: 'hate',      matches: 280,  action: 'block' },
  { keyword: 'harass',    matches: 210,  action: 'flag'  },
  { keyword: 'misinfo',   matches: 165,  action: 'flag'  },
  { keyword: 'impersonate', matches: 120, action: 'block' },
];

const BLOCKED_CONTENT = [
  { category: 'Spam',         blocked: 430, falsePositives: 12 },
  { category: 'Hate Speech',  blocked: 290, falsePositives: 8 },
  { category: 'NSFW',         blocked: 260, falsePositives: 15 },
  { category: 'Harassment',   blocked: 180, falsePositives: 5 },
  { category: 'Misinfo',      blocked: 140, falsePositives: 10 },
];

const BYPASSES = [
  { gistId: 'G-108',  technique: 'URL shortener',  caught: true  },
  { gistId: 'G-112',  technique: 'Leetspeak',       caught: true  },
  { gistId: 'G-117',  technique: 'Image text',      caught: false },
  { gistId: 'G-121',  technique: 'Homoglyphs',      caught: true  },
  { gistId: 'G-125',  technique: 'Encoded base64',  caught: false },
];

export default function ModerationReportPage() {
  const pieData = {
    labels: ACTION_BREAKDOWN.map((a) => `${a.action} (${a.pct}%)`),
    datasets: [{
      data: ACTION_BREAKDOWN.map((a) => a.count),
      backgroundColor: ACTION_BREAKDOWN.map((a) => `${a.color}cc`),
      borderWidth: 0,
    }],
  };

  const kwBar = {
    labels: KEYWORD_RANKING.map((k) => k.keyword),
    datasets: [{
      label: 'Matches',
      data: KEYWORD_RANKING.map((k) => k.matches),
      backgroundColor: KEYWORD_RANKING.map((k) => k.action === 'block' ? 'rgba(239,68,68,0.7)' : 'rgba(251,191,36,0.7)'),
      borderRadius: 3,
    }],
  };

  const blockedBar = {
    labels: BLOCKED_CONTENT.map((c) => c.category),
    datasets: [
      {
        label: 'Blocked',
        data: BLOCKED_CONTENT.map((c) => c.blocked),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 3,
      },
      {
        label: 'False Positives',
        data: BLOCKED_CONTENT.map((c) => c.falsePositives),
        backgroundColor: 'rgba(251,191,36,0.7)',
        borderRadius: 3,
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Moderation Effectiveness Report</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>Auto-moderation performance, keyword ranking, and bypass detection.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Action Breakdown</h3>
          <Pie data={pieData} />
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Keyword Trigger Ranking</h3>
          <Bar data={kwBar} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, indexAxis: 'y' }} height={120} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Blocked Content by Category</h3>
        <Bar data={blockedBar} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} height={80} />
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Bypass Detection Log</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Gist ID</th>
              <th style={{ padding: '8px 12px' }}>Technique</th>
              <th style={{ padding: '8px 12px' }}>Caught</th>
            </tr>
          </thead>
          <tbody>
            {BYPASSES.map((b) => (
              <tr key={b.gistId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{b.gistId}</td>
                <td style={{ padding: '8px 12px' }}>{b.technique}</td>
                <td style={{ padding: '8px 12px', color: b.caught ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {b.caught ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Moderation Log (Sample)</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>Showing 5 most recent entries of 12,847.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Timestamp</th>
              <th style={{ padding: '6px 10px' }}>Gist</th>
              <th style={{ padding: '6px 10px' }}>Action</th>
              <th style={{ padding: '6px 10px' }}>Rule</th>
              <th style={{ padding: '6px 10px' }}>Review Time</th>
            </tr>
          </thead>
          <tbody>
            {[
              { ts: '2026-06-25 08:32', gist: 'G-112', action: 'Block',  rule: 'keyword:scam',     time: '0.9s' },
              { ts: '2026-06-25 08:28', gist: 'G-111', action: 'Flag',   rule: 'keyword:spam',     time: '1.2s' },
              { ts: '2026-06-25 08:15', gist: 'G-110', action: 'Approve', rule: '—',                time: '0.4s' },
              { ts: '2026-06-25 07:58', gist: 'G-109', action: 'Block',  rule: 'keyword:nsfw',     time: '1.8s' },
              { ts: '2026-06-25 07:42', gist: 'G-108', action: 'Escalate', rule: 'suspicious_url',  time: '3.5s' },
            ].map((row) => (
              <tr key={row.gist} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 10px' }}>{row.ts}</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{row.gist}</td>
                <td style={{ padding: '6px 10px' }}>{row.action}</td>
                <td style={{ padding: '6px 10px' }}>{row.rule}</td>
                <td style={{ padding: '6px 10px' }}>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
