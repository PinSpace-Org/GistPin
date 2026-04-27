'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gistpin-report-config';
const METRICS = [
  'Live gists',
  'New vs returning users',
  'Scatter engagement trends',
  'Radar channel activity',
  'Category distribution',
  'Location trends',
];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;

type Frequency = (typeof FREQUENCIES)[number];

interface ReportConfig {
  frequency: Frequency;
  recipients: string[];
  metrics: string[];
}

const defaultConfig: ReportConfig = {
  frequency: 'Weekly',
  recipients: ['ops@gistpin.app', 'founders@gistpin.app'],
  metrics: ['Live gists', 'New vs returning users', 'Category distribution'],
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ReportConfig() {
  const [frequency, setFrequency] = useState<Frequency>(defaultConfig.frequency);
  const [metrics, setMetrics] = useState<string[]>(defaultConfig.metrics);
  const [recipients, setRecipients] = useState<string[]>(defaultConfig.recipients);
  const [emailInput, setEmailInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ReportConfig;
      if (FREQUENCIES.includes(parsed.frequency)) setFrequency(parsed.frequency);
      if (Array.isArray(parsed.metrics)) setMetrics(parsed.metrics.filter((m) => METRICS.includes(m)));
      if (Array.isArray(parsed.recipients)) setRecipients(parsed.recipients.filter((r) => typeof r === 'string'));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const previewTitle = useMemo(() => `${frequency} analytics report`, [frequency]);

  const addRecipient = () => {
    const next = emailInput.trim().toLowerCase();
    if (!next) return;
    if (!isEmail(next)) { setError('Enter a valid email address before adding it.'); return; }
    if (recipients.includes(next)) { setError('That recipient is already included.'); return; }
    setRecipients((c) => [...c, next]);
    setEmailInput('');
    setError(null);
  };

  const removeRecipient = (r: string) => setRecipients((c) => c.filter((x) => x !== r));

  const toggleMetric = (m: string) =>
    setMetrics((c) => (c.includes(m) ? c.filter((x) => x !== m) : [...c, m]));

  const saveConfig = () => {
    if (recipients.length === 0) { setError('Add at least one recipient before saving.'); return; }
    if (metrics.length === 0) { setError('Select at least one metric for the report.'); return; }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ frequency, recipients, metrics }));
    setStatus(`Saved ${frequency.toLowerCase()} report configuration.`);
    setError(null);
  };

  return (
    <section
      style={{
        display: 'grid',
        gap: 28,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignItems: 'start',
      }}
      className="lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 28,
          padding: '30px 28px',
          boxShadow: '0 24px 50px rgba(15,23,42,0.08)',
          border: '1px solid rgba(148,163,184,0.16)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '6px 12px',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          Scheduled Reports
        </div>

        <h1 style={{ margin: '0 0 10px', fontSize: 38, lineHeight: 1.05 }}>
          Configure automated report delivery
        </h1>

        <p style={{ margin: '0 0 28px', color: '#475569', fontSize: 16, maxWidth: 700 }}>
          Set how often reports should be sent, who should receive them, and which analytics matter
          most for each digest.
        </p>

        <div style={{ display: 'grid', gap: 24 }}>
          <label style={{ display: 'grid', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Report frequency</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              style={{
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                padding: '12px 14px',
                fontSize: 15,
                background: '#ffffff',
              }}
            >
              {FREQUENCIES.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Recipients</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                placeholder="team@gistpin.app"
                style={{
                  flex: '1 1 260px',
                  borderRadius: 14,
                  border: '1px solid #cbd5e1',
                  padding: '12px 14px',
                  fontSize: 15,
                }}
              />
              <button
                type="button"
                onClick={addRecipient}
                style={{
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 16px',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Add recipient
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {recipients.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => removeRecipient(r)}
                  style={{
                    border: '1px solid #bfdbfe',
                    borderRadius: 999,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '8px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {r} ×
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Metrics to include</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {METRICS.map((metric) => {
                const checked = metrics.includes(metric);
                return (
                  <label
                    key={metric}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 18,
                      padding: '14px 16px',
                      border: checked ? '1px solid #60a5fa' : '1px solid #e2e8f0',
                      background: checked ? '#eff6ff' : '#ffffff',
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleMetric(metric)} />
                    <span style={{ fontSize: 14 }}>{metric}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={saveConfig}
              style={{
                border: 'none',
                borderRadius: 16,
                background: '#0f172a',
                color: '#ffffff',
                padding: '14px 18px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save configuration
            </button>
            {status && <span style={{ color: '#15803d', fontSize: 14 }}>{status}</span>}
            {error && <span style={{ color: '#b91c1c', fontSize: 14 }}>{error}</span>}
          </div>
        </div>
      </div>

      <aside
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 28,
          padding: '28px',
          color: '#e2e8f0',
          boxShadow: '0 24px 50px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#93c5fd',
            marginBottom: 14,
          }}
        >
          Report Preview
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 22,
            padding: '22px',
            border: '1px solid rgba(148,163,184,0.18)',
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{previewTitle}</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 20 }}>
            Sent to {recipients.length} recipient{recipients.length === 1 ? '' : 's'} every{' '}
            {frequency.toLowerCase()}.
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: '16px',
              borderRadius: 18,
              background: '#ffffff',
              color: '#0f172a',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Delivery</div>
              <div style={{ marginTop: 4, fontSize: 15 }}>{frequency} cadence</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Recipients</div>
              <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
                {recipients.map((r) => (
                  <div key={r} style={{ fontSize: 14 }}>{r}</div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Included metrics</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {metrics.map((m) => (
                  <li key={m} style={{ marginBottom: 6, fontSize: 14 }}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
