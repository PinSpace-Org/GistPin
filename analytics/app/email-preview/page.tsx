'use client';

import { useMemo, useState } from 'react';
import EmailPreview from '@/components/EmailPreview';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EmailPreviewPage() {
  const [recipient, setRecipient] = useState('team@gistpin.app');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent('GistPin test analytics report');
    const body = encodeURIComponent(
      'Hi,\n\nThis is a mock test send for the GistPin analytics email report.\n\nOpen the dashboard: https://github.com/PinSpace-Org/GistPin',
    );
    return `mailto:${recipient}?subject=${subject}&body=${body}`;
  }, [recipient]);

  const handleTestSend = () => {
    if (!isEmail(recipient)) {
      setNotification('Enter a valid email address before sending a test.');
      return;
    }
    window.location.href = mailtoHref;
    setNotification(`Test email opened for ${recipient}.`);
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          background: 'linear-gradient(135deg, #ffffff 0%, #ede9fe 100%)',
          borderRadius: 28,
          padding: '30px 30px 26px',
          boxShadow: '0 18px 46px rgba(15,23,42,0.08)',
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              padding: '6px 12px',
              background: '#5b21b6',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Email Report
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: 38, lineHeight: 1.05 }}>
            Preview and test send email reports
          </h1>

          <p style={{ margin: 0, color: '#475569', fontSize: 16, maxWidth: 700 }}>
            Review the HTML email layout, open a large preview modal, and trigger a mock test send
            using your default mail client.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12, minWidth: 320 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Test recipient</span>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                padding: '12px 14px',
                fontSize: 15,
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                border: 'none',
                borderRadius: 999,
                background: '#1d4ed8',
                color: '#ffffff',
                padding: '12px 16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Preview email
            </button>
            <button
              type="button"
              onClick={handleTestSend}
              style={{
                border: 'none',
                borderRadius: 999,
                background: '#111827',
                color: '#ffffff',
                padding: '12px 16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Send test
            </button>
          </div>

          {notification && (
            <div
              style={{
                borderRadius: 14,
                background: isEmail(recipient) ? '#ecfdf5' : '#fef2f2',
                color: isEmail(recipient) ? '#047857' : '#b91c1c',
                padding: '12px 14px',
                fontSize: 14,
              }}
            >
              {notification}
            </div>
          )}
        </div>
      </section>

      <EmailPreview />

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 'min(960px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: '#ffffff',
              borderRadius: 26,
              padding: 20,
              boxShadow: '0 30px 80px rgba(15,23,42,0.30)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  Full Preview
                </div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Email report modal</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  background: '#e2e8f0',
                  color: '#0f172a',
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <EmailPreview />
          </div>
        </div>
      )}
    </main>
  );
}
