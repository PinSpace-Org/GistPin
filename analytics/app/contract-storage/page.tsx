// Soroban contract storage cost tracker: size and XLM cost per contract, the
// growth rate behind it, a forecast, and where optimization pays off most.
const card = { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' };
const th = { padding: '8px 10px', fontWeight: 600 } as const;
const td = { padding: '8px 10px' } as const;

// Rent is charged per KB per ledger; this rate is the network fee approximation.
const XLM_PER_KB_MONTH = 0.0042;
const FORECAST_MONTHS = 6;

// Sample ledger snapshot; swap for the live Soroban RPC reader when it lands.
const CONTRACTS = [
  { name: 'pin-registry', kb: 412, growthPctMonth: 8.5, entries: 18400 },
  { name: 'gist-index', kb: 1180, growthPctMonth: 12.2, entries: 52100 },
  { name: 'reputation', kb: 96, growthPctMonth: 3.1, entries: 4200 },
  { name: 'moderation-log', kb: 640, growthPctMonth: 21.0, entries: 30900 },
];

const cost = (kb: number) => kb * XLM_PER_KB_MONTH;
// Compound the monthly growth rate rather than extrapolating linearly.
const forecastKb = (c: (typeof CONTRACTS)[number]) =>
  c.kb * Math.pow(1 + c.growthPctMonth / 100, FORECAST_MONTHS);
// Fast growth on many small entries is the case archival actually helps.
const advice = (c: (typeof CONTRACTS)[number]) =>
  c.growthPctMonth > 15 ? 'Archive cold entries — growth outpaces rent budget'
    : c.kb / c.entries > 0.03 ? 'Pack struct fields; per-entry footprint is high'
      : 'Within budget — no action';

export default function ContractStoragePage() {
  const totalNow = CONTRACTS.reduce((s, c) => s + cost(c.kb), 0);
  const totalLater = CONTRACTS.reduce((s, c) => s + cost(forecastKb(c)), 0);
  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Contract Storage Costs</h1>
      <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 15 }}>
        {totalNow.toFixed(2)} XLM/month today, forecast <strong>{totalLater.toFixed(2)} XLM/month</strong> in{' '}
        {FORECAST_MONTHS} months at current growth — a {((totalLater / totalNow - 1) * 100).toFixed(0)}% rise.
      </p>
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={th}>Contract</th><th style={th}>Size</th><th style={th}>Cost/mo</th>
            <th style={th}>Growth</th><th style={th}>{FORECAST_MONTHS}mo forecast</th>
            <th style={th}>Recommendation</th></tr></thead>
          <tbody>{CONTRACTS.map((c) => (
            <tr key={c.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
              <td style={td}>{c.kb.toLocaleString()} KB</td>
              <td style={td}>{cost(c.kb).toFixed(2)} XLM</td>
              <td style={{ ...td, color: c.growthPctMonth > 15 ? '#dc2626' : '#374151' }}>
                +{c.growthPctMonth}%/mo</td>
              <td style={td}>{Math.round(forecastKb(c)).toLocaleString()} KB · {cost(forecastKb(c)).toFixed(2)} XLM</td>
              <td style={{ ...td, color: '#6b7280' }}>{advice(c)}</td></tr>))}</tbody>
        </table>
      </div>
    </main>
  );
}
