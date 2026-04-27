'use client';

const COLORS = [
  { name: 'Primary', hex: '#1d4ed8', text: '#fff' },
  { name: 'Success', hex: '#15803d', text: '#fff' },
  { name: 'Danger',  hex: '#b91c1c', text: '#fff' },
  { name: 'Warning', hex: '#b45309', text: '#fff' },
  { name: 'Slate 50',  hex: '#f8fafc', text: '#0f172a' },
  { name: 'Slate 800', hex: '#1e293b', text: '#fff' },
];

const TYPOGRAPHY = [
  { label: 'text-4xl / 700', size: 36, weight: 700 },
  { label: 'text-2xl / 700', size: 24, weight: 700 },
  { label: 'text-xl / 600',  size: 20, weight: 600 },
  { label: 'text-base / 400', size: 16, weight: 400 },
  { label: 'text-sm / 400',  size: 14, weight: 400 },
  { label: 'text-xs / 400',  size: 12, weight: 400 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{
        background: 'linear-gradient(135deg,#ffffff 0%,#fce7f3 100%)',
        borderRadius: 28, padding: '28px 28px 24px',
        boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 36,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', borderRadius: 999,
          padding: '6px 12px', background: '#be185d', color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>Design System</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 34 }}>Component showcase</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
          Visual reference for GistPin Analytics UI components, tokens, and patterns.
        </p>
      </div>

      {/* Colors */}
      <Section title="Color palette">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {COLORS.map((c) => (
            <div key={c.name} style={{
              width: 120, borderRadius: 12, overflow: 'hidden',
              border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ background: c.hex, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: c.text, fontSize: 11, fontFamily: 'monospace' }}>{c.hex}</span>
              </div>
              <div style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>{c.name}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography scale">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TYPOGRAPHY.map((t) => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontSize: t.size, fontWeight: t.weight, lineHeight: 1.2 }}>
                GistPin Analytics
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {[
            { label: 'Primary', bg: '#1d4ed8', color: '#fff' },
            { label: 'Secondary', bg: '#f1f5f9', color: '#0f172a' },
            { label: 'Danger', bg: '#b91c1c', color: '#fff' },
            { label: 'Success', bg: '#15803d', color: '#fff' },
          ].map((btn) => (
            <button key={btn.label} type="button" style={{
              background: btn.bg, color: btn.color, border: 'none',
              borderRadius: 999, padding: '10px 20px', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}>{btn.label}</button>
          ))}
          <button type="button" style={{
            background: 'transparent', color: '#1d4ed8',
            border: '2px solid #1d4ed8', borderRadius: 999,
            padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Outline</button>
        </div>
        <pre style={{ background: '#0f172a', color: '#94a3b8', borderRadius: 10, padding: 16, marginTop: 16, fontSize: 12, overflowX: 'auto' }}>{`<button style={{
  background: '#1d4ed8', color: '#fff',
  border: 'none', borderRadius: 999,
  padding: '10px 20px', fontWeight: 700,
}}>Primary</button>`}</pre>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {[
            { title: 'Stat card', value: '4,821', sub: 'Total gists this week' },
            { title: 'KPI card', value: '↑ 12.4%', sub: 'Engagement rate' },
          ].map((card) => (
            <div key={card.title} style={{
              background: '#fff', borderRadius: 20, padding: 20,
              border: '1px solid rgba(148,163,184,0.18)',
              boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
            }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>
        <pre style={{ background: '#0f172a', color: '#94a3b8', borderRadius: 10, padding: 16, marginTop: 16, fontSize: 12, overflowX: 'auto' }}>{`<div style={{
  background: '#fff', borderRadius: 20, padding: 20,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
}}>
  <div style={{ fontSize: 13, color: '#64748b' }}>Label</div>
  <div style={{ fontSize: 28, fontWeight: 700 }}>Value</div>
</div>`}</pre>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Live', bg: '#dcfce7', color: '#15803d' },
            { label: 'Beta', bg: '#dbeafe', color: '#1d4ed8' },
            { label: 'Deprecated', bg: '#fee2e2', color: '#b91c1c' },
            { label: 'New', bg: '#fef3c7', color: '#b45309' },
          ].map((b) => (
            <span key={b.label} style={{
              background: b.bg, color: b.color, borderRadius: 999,
              padding: '4px 12px', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{b.label}</span>
          ))}
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Spacing scale">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: s, height: s, background: '#1d4ed8', borderRadius: 3 }} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{s}px</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
