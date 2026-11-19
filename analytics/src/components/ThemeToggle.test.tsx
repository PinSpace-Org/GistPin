import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

const STORAGE_KEY = 'gistpin-analytics-theme';

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ThemeToggle', () => {
  it('starts as System when nothing is stored', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Theme: System. Click to change.' })).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('shows the stored theme on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    render(<ThemeToggle />);

    expect(screen.getByText('Dark')).toBeDefined();
  });

  it('ignores an unknown stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'solarized');

    render(<ThemeToggle />);

    expect(screen.getByText('System')).toBeDefined();
  });

  it('cycles system -> light -> dark -> system', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(button.textContent).toBe('Light');
    fireEvent.click(button);
    expect(button.textContent).toBe('Dark');
    fireEvent.click(button);
    expect(button.textContent).toBe('System');
  });

  it('persists each choice to localStorage', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('applies the chosen theme to the document', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button')); // light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button')); // dark
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolves System to the OS preference when it is cycled back to', () => {
    mockMatchMedia(true);
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button')); // dark -> system

    expect(screen.getByText('System')).toBeDefined();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('does not throw when localStorage reads fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => render(<ThemeToggle />)).not.toThrow();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('still changes the theme when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<ThemeToggle />);

    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();

    expect(screen.getByText('Light')).toBeDefined();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
