'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gistpin-notification-prefs';

interface AlertPrefs {
  dailySummary: boolean;
  spikeDetection: boolean;
  anomalyDetection: boolean;
  weeklyReport: boolean;
  systemErrors: boolean;
  email: string;
  slackWebhook: string;
  spikeThreshold: number;
}

const DEFAULT_PREFS: AlertPrefs = {
  dailySummary: true,
  spikeDetection: true,
  anomalyDetection: false,
  weeklyReport: true,
  systemErrors: true,
  email: '',
  slackWebhook: '',
  spikeThreshold: 50,
};

const ALERT_TYPES: { key: keyof AlertPrefs; label: string; description: string }[] = [
  { key: 'dailySummary',     label: 'Daily summary email',    description: 'Receive a daily digest of key metrics.' },
  { key: 'spikeDetection',   label: 'Spike detection',        description: `Alert when a metric increases by more than the threshold.` },
  { key: 'anomalyDetection', label: 'Anomaly detection',      description: 'ML-based alerts for unusual patterns.' },
  { key: 'weeklyReport',     label: 'Weekly report',          description: 'Full analytics report every Monday.' },
  { key: 'systemErrors',     label: 'System errors',          description: 'Immediate alert on critical system errors.' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        background: checked ? '#6366f1' : '#cbd5e1',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(saved) as Partial<AlertPrefs>) });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toggle = (key: keyof AlertPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = () => {
    if (prefs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefs.email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (prefs.slackWebhook && !prefs.slackWebhook.startsWith('https://')) {
      setError('Slack webhook must start with https://');
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setStatus('Preferences saved.');
    setError(null);
  };

  const sendTest = () => {
    if (!prefs.email && !prefs.slackWebhook) {
      setError('Add an email or Slack webhook before sending a test.');
      return;
    }
    setTestSent(true);
    setError(null);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Notification Preferences</h1>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        Configure which alerts you receive and how they are delivered.
      </p>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gap: 24,
        }}
      >
        {/* Alert toggles */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#0f172a' }}>Alert Types</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {ALERT_TYPES.map(({ key, label, description }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: (prefs[key] as boolean) ? '#f5f3ff' : '#f8fafc',
                }}
              >
                <Toggle checked={prefs[key] as boolean} onChange={() => toggle(key)} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spike threshold */}
        {prefs.spikeDetection && (
          <section>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Spike threshold: {prefs.spikeThreshold}%
              </span>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={prefs.spikeThreshold}
                onChange={(e) => setPrefs((p) => ({ ...p, spikeThreshold: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <span>10%</span><span>200%</span>
              </div>
            </label>
          </section>
        )}

        {/* Delivery channels */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#0f172a' }}>Delivery Channels</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Email address</span>
              <input
                type="email"
                value={prefs.email}
                onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                style={{
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: 14,
                }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Slack webhook URL</span>
              <input
                type="url"
                value={prefs.slackWebhook}
                onChange={(e) => setPrefs((p) => ({ ...p, slackWebhook: e.target.value }))}
                placeholder="https://hooks.slack.com/services/..."
                style={{
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: 14,
                }}
              />
            </label>
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={save}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Save preferences
          </button>
          <button
            onClick={sendTest}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: '1px solid #6366f1',
              background: '#ffffff',
              color: '#6366f1',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Send test notification
          </button>
          {status && <span style={{ fontSize: 13, color: '#15803d' }}>{status}</span>}
          {error && <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>}
          {testSent && <span style={{ fontSize: 13, color: '#6366f1' }}>✓ Test notification sent!</span>}
        </div>
      </div>
    </main>
  );
}
