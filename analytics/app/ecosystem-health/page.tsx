// Platform ecosystem health index: one weighted 0-100 composite, its component
// breakdown, an 8-week trend, and an alert when the index drops week on week.
const card = { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' };
const row = { display: 'flex', gap: 12, marginBottom: 10, fontSize: 13 } as const;
const bar = { flex: 1, height: 8, marginTop: 4, background: '#f3f4f6', borderRadius: 4 } as const;

// Weights sum to 1. Retention is weighted highest: it moves slowest and is the
// hardest signal to recover once it slips.
const COMPONENTS = [
  { label: 'Contributor retention', weight: 0.3, score: 71 },
  { label: 'Pin & gist activity', weight: 0.25, score: 88 },
  { label: 'Service reliability', weight: 0.25, score: 94 },
  { label: 'New contributor growth', weight: 0.2, score: 58 },
];
const TREND = [79, 81, 80, 82, 83, 81, 78, 77]; // most recent week last
const DROP_ALERT_POINTS = 2;

const index = COMPONENTS.reduce((s, c) => s + c.score * c.weight, 0);
const delta = TREND[TREND.length - 1] - TREND[TREND.length - 2];
const band = (n: number) => (n >= 85 ? '#15803d' : n >= 70 ? '#f59e0b' : '#dc2626');

export default function EcosystemHealthPage() {
  const weakest = [...COMPONENTS].sort((a, b) => a.score - b.score)[0];
  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Ecosystem Health Index</h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 15 }}>
        Weekly composite of {COMPONENTS.length} weighted components; alerts on a{' '}
        {DROP_ALERT_POINTS}+ point drop week on week.</p>
      <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span style={{ fontSize: 56, fontWeight: 800, color: band(index) }}>{index.toFixed(1)}</span>
        <span style={{ fontSize: 15, color: delta < 0 ? '#dc2626' : '#15803d' }}>
          {delta >= 0 ? '+' : ''}{delta} vs last week</span>
      </div>
      {delta <= -DROP_ALERT_POINTS && (
        <div style={{ ...card, marginBottom: 20, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 13 }}>
          <strong>⚠️ Index dropped {Math.abs(delta)} points.</strong> Weakest component:{' '}
          <strong>{weakest.label}</strong> at {weakest.score}/100 — include in the weekly report.</div>)}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Component breakdown</h3>
        {COMPONENTS.map((c) => (
          <div key={c.label} style={row}>
            <span style={{ width: 200 }}>{c.label}</span>
            <span style={{ width: 44, color: '#6b7280' }}>{Math.round(c.weight * 100)}%</span>
            <span style={bar}><span style={{ display: 'block', width: `${c.score}%`, height: 8, background: band(c.score), borderRadius: 4 }} /></span>
            <span style={{ width: 34, textAlign: 'right' }}>{c.score}</span></div>))}
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>8-week trend</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
          {TREND.map((v, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>
              <div style={{ height: v, background: band(v), borderRadius: '4px 4px 0 0', marginBottom: 4 }} />{v}</div>))}
        </div>
      </div>
    </main>
  );
}
