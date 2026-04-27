'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
  onSearch?: () => void;
  onRefresh?: () => void;
  onToggleDark?: () => void;
  onHelp?: () => void;
}

export function useKeyboardShortcuts({
  onSearch,
  onRefresh,
  onToggleDark,
  onHelp,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onSearch?.(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'r' || e.key === 'R') onRefresh?.();
      else if (e.key === 'd' || e.key === 'D') onToggleDark?.();
      else if (e.key === '?') onHelp?.();
    },
    [onSearch, onRefresh, onToggleDark, onHelp],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
