/**
 * Light/dark/system theme persistence. All localStorage access is
 * wrapped in try/catch so a blocked or unavailable localStorage (private
 * browsing, disabled storage) degrades to "system" rather than throwing.
 */

export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gistpin-analytics-theme';
const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

export function getStoredTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return (THEMES as readonly string[]).includes(raw ?? '') ? (raw as Theme) : 'system';
  } catch {
    return 'system';
  }
}

export function setStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable — the choice just won't persist across reloads.
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
}

/** system -> light -> dark -> system. */
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current);
  return THEMES[(index + 1) % THEMES.length];
}

/**
 * Source for the inline `<script>` that must run before first paint to
 * avoid a flash of the wrong theme. Kept as a plain string (not importing
 * the functions above) since it runs outside the bundled JS.
 */
export const NO_FLASH_SCRIPT = `
(function () {
  try {
    var key = '${STORAGE_KEY}';
    var stored = window.localStorage.getItem(key);
    var theme = ['system', 'light', 'dark'].indexOf(stored) !== -1 ? stored : 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    // localStorage/matchMedia unavailable — leave the default (light) theme.
  }
})();
`.trim();
