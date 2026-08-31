// Contributor skill gap analyzer: open vs claimed issues per skill area, who is
// available to work them, and which areas to recruit for first.
const card = { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' };
const th = { padding: '8px 10px', fontWeight: 600 } as const;
const td = { padding: '8px 10px' } as const;

// Sample snapshot; swap for the live issue-label + contributor query when it lands.
const AREAS = [
  { skill: 'Soroban / Rust', open: 24, claimed: 6, contributors: 3, trend: [9, 12, 18] },
  { skill: 'Next.js / React', open: 31, claimed: 27, contributors: 19, trend: [6, 5, 4] },
  { skill: 'Analytics / dataviz', open: 18, claimed: 11, contributors: 7, trend: [8, 7, 7] },
  { skill: 'DevOps / CI', open: 9, claimed: 2, contributors: 2, trend: [4, 6, 7] },
];

const unclaimed = (a: (typeof AREAS)[number]) => a.open - a.claimed;
// Unclaimed issues per available contributor — the backlog one person must carry.
const load = (a: (typeof AREAS)[number]) => unclaimed(a) / Math.max(a.contributors, 1);
// Trend of the unclaimed count over the last three months.
const rising = (a: (typeof AREAS)[number]) => a.trend[2] > a.trend[0];
const priority = (a: (typeof AREAS)[number]) =>
  load(a) >= 5 ? 'critical' : load(a) >= 2 ? 'high' : 'steady';
const COLOR = { critical: '#dc2626', high: '#f59e0b', steady: '#15803d' } as const;

export default function SkillGapsPage() {
  const ranked = [...AREAS].sort((a, b) => load(b) - load(a));
  const worst = ranked[0];
  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Contributor Skill Gaps</h1>
      <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 15 }}>
        Recruit for <strong>{worst.skill}</strong> first — {unclaimed(worst)} unclaimed issues across{' '}
        {worst.contributors} contributor{worst.contributors === 1 ? '' : 's'} ({load(worst).toFixed(1)} each).
      </p>
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={th}>Skill area</th><th style={th}>Open</th><th style={th}>Claimed</th>
            <th style={th}>Unclaimed</th><th style={th}>Contributors</th><th style={th}>Load each</th>
            <th style={th}>Gap trend</th><th style={th}>Priority</th></tr></thead>
          <tbody>{ranked.map((a) => (
            <tr key={a.skill} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ ...td, fontWeight: 600 }}>{a.skill}</td>
              <td style={td}>{a.open}</td><td style={td}>{a.claimed}</td>
              <td style={td}>{unclaimed(a)}</td><td style={td}>{a.contributors}</td>
              <td style={td}>{load(a).toFixed(1)}</td>
              <td style={{ ...td, color: rising(a) ? '#dc2626' : '#15803d' }}>
                {a.trend.join(' → ')} {rising(a) ? '↑' : '↓'}</td>
              <td style={{ ...td, fontWeight: 700, color: COLOR[priority(a)] }}>{priority(a)}</td></tr>))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
