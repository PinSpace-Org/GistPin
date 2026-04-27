'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ShortcutHandlers {
  onSearch?: () => void;
  onRefresh?: () => void;
  onToggleDark?: () => void;
  onExport?: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Open search' },
  { keys: ['R'],       description: 'Refresh data' },
  { keys: ['D'],       description: 'Toggle dark mode' },
  { keys: ['E'],       description: 'Export current view' },
  { keys: ['?'],       description: 'Show this help' },
];

/**
 * Registers global keyboard shortcuts and renders a help modal on `?`.
 * Mount once at the layout level and pass handler callbacks.
 */
export default function KeyboardShortcuts({ onSearch, onRefresh, onToggleDark, onExport }: ShortcutHandlers) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire when typing in inputs/textareas
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        // Allow Escape to close help even from inputs
        if (e.key === 'Escape') setHelpOpen(false);
        return;
      }

      // Cmd/Ctrl + K → search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Single-key shortcuts (no modifier)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'r':
        case 'R':
          onRefresh?.();
          break;
        case 'd':
        case 'D':
          onToggleDark?.();
          break;
        case 'e':
        case 'E':
          onExport?.();
          break;
        case '?':
          setHelpOpen((v) => !v);
          break;
        case 'Escape':
          setHelpOpen(false);
          break;
      }
    },
    [onSearch, onRefresh, onToggleDark, onExport],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!helpOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.5)' }}
        onClick={() => setHelpOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
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
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
            aria-label="Close"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '12px 20px 20px' }}>
          {SHORTCUTS.map(({ keys, description }) => (
            <div
              key={description}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}
            >
              <span style={{ fontSize: 13, color: '#334155' }}>{description}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {keys.map((k) => (
                  <kbd
                    key={k}
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '2px 7px',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
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
