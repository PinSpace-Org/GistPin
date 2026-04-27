'use client';

import { EMAIL_SUMMARY_CARDS, DASHBOARD_URL } from '@/lib/email-template';

export default function EmailPreview() {
  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 24,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 100%)',
          padding: '28px 28px 30px',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.16)',
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          GP
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>GistPin Weekly Report</div>
        <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15 }}>
          Your latest analytics summary is ready to review and share.
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 22,
          }}
        >
          {EMAIL_SUMMARY_CARDS.map((card) => (
            <div
              key={card.label}
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '16px 18px',
                border: '1px solid #dbeafe',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Chart snapshot</div>
            <div
              style={{
                height: 150,
                borderRadius: 18,
                background:
                  'linear-gradient(180deg, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0.04) 100%)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '28px 22px 18px',
                  borderLeft: '3px solid #2563eb',
                  borderBottom: '3px solid #2563eb',
                  borderRadius: '0 0 0 14px',
                  transform: 'skewY(-10deg)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Key actions</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#334155' }}>
              <li style={{ marginBottom: 8 }}>Review location trends with the analytics dashboard.</li>
              <li style={{ marginBottom: 8 }}>Share this summary with city operations leads.</li>
              <li>Open the dashboard to dig into chart-level details.</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={DASHBOARD_URL}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: '#1d4ed8',
              color: '#ffffff',
              padding: '12px 16px',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Open dashboard
          </a>
          <a
            href={DASHBOARD_URL}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '12px 16px',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            View full report
          </a>
        </div>
      </div>
    </div>
  );
}
