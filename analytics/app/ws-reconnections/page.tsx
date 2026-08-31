// WebSocket reconnection analytics: disconnect frequency, recovery rate and
// session life by region, plus the client-side error mix behind the drops.
const card = { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' };
const th = { padding: '8px 10px', fontWeight: 600 } as const;
const td = { padding: '8px 10px' } as const;

// Sample telemetry; swap for the live metrics source when it lands.
const REGIONS = [
  { region: 'us-east', drops: 1840, recovered: 1795, sessionMin: 42, rttMs: 38 },
  { region: 'eu-west', drops: 1210, recovered: 1188, sessionMin: 51, rttMs: 44 },
  { region: 'ap-south', drops: 2310, recovered: 2016, sessionMin: 27, rttMs: 121 },
  { region: 'sa-east', drops: 940, recovered: 806, sessionMin: 31, rttMs: 96 },
];
const ERRORS = [['1006 abnormal closure', 47], ['1001 going away', 26],
  ['1011 server error', 15], ['timeout (no pong)', 12]] as const;

const rate = (r: (typeof REGIONS)[number]) => (r.recovered / r.drops) * 100;
// Higher RTT tracks lower recovery, so show quality beside the rate, not alone.
const quality = (ms: number) => (ms < 60 ? 'good' : ms < 100 ? 'fair' : 'poor');

export default function WsReconnectionsPage() {
  const worst = [...REGIONS].sort((a, b) => rate(a) - rate(b))[0];
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>WebSocket Reconnections</h1>
      <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 15 }}>
        Weakest recovery: <strong>{worst.region}</strong> at {rate(worst).toFixed(1)}% — network
        quality {quality(worst.rttMs)} ({worst.rttMs} ms RTT).
      </p>
      <div style={{ ...card, marginBottom: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={th}>Region</th><th style={th}>Disconnects</th><th style={th}>Reconnect rate</th>
            <th style={th}>Avg session before drop</th><th style={th}>Network quality</th></tr></thead>
          <tbody>{REGIONS.map((r) => (
            <tr key={r.region} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ ...td, fontWeight: 600 }}>{r.region}</td>
              <td style={td}>{r.drops.toLocaleString()}</td>
              <td style={{ ...td, color: rate(r) < 90 ? '#dc2626' : '#15803d' }}>{rate(r).toFixed(1)}%</td>
              <td style={td}>{r.sessionMin} min</td>
              <td style={td}>{quality(r.rttMs)} · {r.rttMs} ms</td></tr>))}</tbody>
        </table>
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Client-side error breakdown</h3>
        {ERRORS.map(([code, share]) => (
          <div key={code} style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 13 }}>
            <span style={{ width: 190 }}>{code}</span>
            <span style={{ flex: 1, height: 8, marginTop: 4, background: '#f3f4f6', borderRadius: 4 }}>
              <span style={{ display: 'block', width: `${share}%`, height: 8, background: '#6366f1', borderRadius: 4 }} />
            </span>
            <span style={{ width: 40, textAlign: 'right' }}>{share}%</span></div>))}
      </div>
    </main>
  );
}
