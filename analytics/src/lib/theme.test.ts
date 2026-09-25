import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredTheme, setStoredTheme, nextTheme, resolveTheme } from './theme';

describe('nextTheme', () => {
  it('cycles system -> light -> dark -> system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('getStoredTheme / setStoredTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips a stored theme', () => {
    setStoredTheme('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('defaults to system when nothing is stored', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('defaults to system for a corrupted stored value', () => {
    window.localStorage.setItem('gistpin-analytics-theme', 'not-a-theme');
    expect(getStoredTheme()).toBe('system');
  });

  it('does not throw when localStorage.getItem throws', () => {
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(() => getStoredTheme()).not.toThrow();
    expect(getStoredTheme()).toBe('system');
    spy.mockRestore();
  });

  it('does not throw when localStorage.setItem throws', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(() => setStoredTheme('dark')).not.toThrow();
    spy.mockRestore();
  });
});

describe('resolveTheme', () => {
  it('passes light/dark through unchanged', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
});
