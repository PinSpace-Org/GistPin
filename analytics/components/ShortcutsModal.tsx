'use client';

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Open search' },
  { keys: ['R'],       description: 'Refresh data' },
  { keys: ['D'],       description: 'Toggle dark mode' },
  { keys: ['?'],       description: 'Show this help' },
];

interface ShortcutsModalProps {
  onClose: () => void;
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 310,
          width: 'min(400px, 90vw)',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Keyboard Shortcuts</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} aria-label="Close">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '12px 20px 20px' }}>
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, color: '#334155' }}>{description}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {keys.map((k) => (
                  <kbd key={k} style={{ fontSize: 12, fontFamily: 'monospace', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', color: '#334155', fontWeight: 600 }}>
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
