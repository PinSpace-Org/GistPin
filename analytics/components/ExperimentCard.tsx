'use client';

export interface Variant {
  name: string;
  visitors: number;
  conversions: number;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'active' | 'completed';
  variants: [Variant, Variant];
  winner?: 'A' | 'B' | null;
}

/** Chi-square p-value approximation (2×2 contingency table, 1 df) */
export function chiSquarePValue(a: Variant, b: Variant): number {
  const n = a.visitors + b.visitors;
  const successes = a.conversions + b.conversions;
  const failures = n - successes;
  const expected = (row: number, col: number) => (row * col) / n;
  const cells = [
    [a.conversions, expected(successes, a.visitors)],
    [a.visitors - a.conversions, expected(failures, a.visitors)],
    [b.conversions, expected(successes, b.visitors)],
    [b.visitors - b.conversions, expected(failures, b.visitors)],
  ];
  const chi2 = cells.reduce((sum, [obs, exp]) => sum + Math.pow(obs - exp, 2) / exp, 0);
  return Math.min(1, Math.max(0, Math.exp(-0.717 * chi2 - 0.416 * chi2 * chi2)));
}

function ConversionBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#f1f5f9' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${rate * 100}%`, background: color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, color: '#334155' }}>
        {(rate * 100).toFixed(1)}%
      </span>
    </div>
  );
}

interface ExperimentCardProps {
  experiment: Experiment;
  onDeclareWinner: (id: string, winner: 'A' | 'B') => void;
}

export default function ExperimentCard({ experiment: exp, onDeclareWinner }: ExperimentCardProps) {
  const [a, b] = exp.variants;
  const rateA = a.conversions / a.visitors;
  const rateB = b.conversions / b.visitors;
  const p = chiSquarePValue(a, b);
  const significant = p < 0.05;
  const leading = rateB > rateA ? 'B' : 'A';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '22px 24px',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{exp.name}</h2>
        <span
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: exp.status === 'active' ? '#dbeafe' : '#f1f5f9',
            color: exp.status === 'active' ? '#1d4ed8' : '#64748b',
          }}
        >
          {exp.status}
        </span>
        {significant
          ? <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>✓ Significant (p = {p.toFixed(3)})</span>
          : <span style={{ fontSize: 12, color: '#94a3b8' }}>Not significant yet (p = {p.toFixed(3)})</span>
        }
        {exp.winner && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>🏆 Winner: Variant {exp.winner}</span>
        )}
      </div>

      {/* Variants */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        {([a, b] as Variant[]).map((v, idx) => {
          const rate = v.conversions / v.visitors;
          const isWinner = exp.winner === (idx === 0 ? 'A' : 'B');
          const color = idx === 0 ? '#6366f1' : '#10b981';
          return (
            <div
              key={v.name}
              style={{
                padding: '14px 16px', borderRadius: 12,
                background: isWinner ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${isWinner ? '#86efac' : '#e2e8f0'}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                {idx === 0 ? 'A' : 'B'}: {v.name}
              </div>
              <ConversionBar rate={rate} color={color} />
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                {v.conversions.toLocaleString()} / {v.visitors.toLocaleString()} visitors
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence interval visual */}
      <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Confidence interval (95%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#e2e8f0', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', left: '30%', right: '20%', height: '100%',
                borderRadius: 999, background: significant ? '#6366f1' : '#94a3b8', opacity: 0.6,
              }}
            />
            <div
              style={{
                position: 'absolute', left: `${Math.min(rateA, rateB) * 100 * 0.9}%`,
                width: 2, height: '100%', background: '#0f172a',
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Δ {(Math.abs(rateB - rateA) * 100).toFixed(1)}pp</span>
        </div>
      </div>

      {/* Declare winner */}
      {exp.status === 'active' && significant && !exp.winner && (
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#475569', alignSelf: 'center' }}>Declare winner:</span>
          {(['A', 'B'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onDeclareWinner(exp.id, v)}
              style={{
                padding: '8px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13,
                border: `1px solid ${v === 'A' ? '#6366f1' : '#10b981'}`,
                background: leading === v ? (v === 'A' ? '#6366f1' : '#10b981') : '#ffffff',
                color: leading === v ? '#ffffff' : (v === 'A' ? '#6366f1' : '#10b981'),
              }}
            >
              Variant {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
