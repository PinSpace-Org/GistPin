'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, nextTheme, setStoredTheme, type Theme } from '@/lib/theme';

const LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/** Header toggle cycling system -> light -> dark -> system, persisted in localStorage. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // The actual pre-paint theme is already applied by the inline script in
  // layout.tsx; this just syncs the button's label to what was stored.
  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const cycle = () => {
    const next = nextTheme(theme);
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[theme]}. Click to change.`}
      className="rounded-md border border-[var(--foreground)]/20 px-3 py-1.5 text-sm"
    >
      {LABELS[theme]}
    </button>
  );
}
