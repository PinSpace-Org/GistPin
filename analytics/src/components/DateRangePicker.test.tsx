import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/stats',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { DateRangePicker } from './DateRangePicker';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Selected presets use bg-blue-100; the selected Custom button uses text-neutral-900.
// (Unselected buttons only carry hover: variants, so these substrings are unambiguous.)
const isPresetSelected = (el: HTMLElement) => el.className.includes('bg-blue-100');
const isCustomSelected = (el: HTMLElement) => el.className.includes('text-neutral-900');

/** Parses the URL passed to the last router.replace call. */
const lastUrl = () => {
  const calls = nav.replace.mock.calls;
  return new URL(String(calls[calls.length - 1]?.[0]), 'http://localhost');
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  nav.replace.mockClear();
  nav.pathname = '/stats';
  nav.search = '';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DateRangePicker presets', () => {
  it('renders every preset and a Custom button', () => {
    render(<DateRangePicker />);

    for (const label of ['Last hour', 'Last 24h', 'Last 7d', 'Last 30d', 'Last 90d', 'Custom']) {
      expect(screen.getByRole('button', { name: label })).toBeDefined();
    }
  });

  it.each([
    ['Last hour', '1h', HOUR],
    ['Last 24h', '24h', DAY],
    ['Last 7d', '7d', 7 * DAY],
    ['Last 30d', '30d', 30 * DAY],
    ['Last 90d', '90d', 90 * DAY],
  ])('%s sets preset=%s and a from/to range of the matching length', (label, preset, span) => {
    render(<DateRangePicker />);

    fireEvent.click(screen.getByRole('button', { name: label }));

    const url = lastUrl();
    expect(url.pathname).toBe('/stats');
    expect(url.searchParams.get('preset')).toBe(preset);
    expect(url.searchParams.get('to')).toBe(NOW.toISOString());
    expect(url.searchParams.get('from')).toBe(new Date(NOW.getTime() - span).toISOString());
  });

  it('keeps unrelated query params when choosing a preset', () => {
    nav.search = 'bucket=day';

    render(<DateRangePicker />);
    fireEvent.click(screen.getByRole('button', { name: 'Last 7d' }));

    expect(lastUrl().searchParams.get('bucket')).toBe('day');
  });

  it('highlights the preset named in the URL and hides the custom inputs', () => {
    nav.search = 'preset=7d';

    render(<DateRangePicker />);

    expect(isPresetSelected(screen.getByRole('button', { name: 'Last 7d' }))).toBe(true);
    expect(isPresetSelected(screen.getByRole('button', { name: 'Last 24h' }))).toBe(false);
    expect(isCustomSelected(screen.getByRole('button', { name: 'Custom' }))).toBe(false);
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(screen.queryByLabelText('To')).toBeNull();
  });
});

describe('DateRangePicker custom range', () => {
  it('shows the custom inputs, defaulting to the last 24 hours, when no preset is set', () => {
    render(<DateRangePicker />);

    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2026-06-14T12:00');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2026-06-15T12:00');
  });

  it('uses defaultFrom and defaultTo when the URL has no range', () => {
    render(
      <DateRangePicker defaultFrom="2026-02-01T08:00:00.000Z" defaultTo="2026-02-03T09:30:00.000Z" />,
    );

    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2026-02-01T08:00');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2026-02-03T09:30');
  });

  it('prefers the from/to in the URL over the default props', () => {
    nav.search = 'from=2026-03-01T00:00:00.000Z&to=2026-03-02T06:15:00.000Z';

    render(<DateRangePicker defaultFrom="2026-02-01T08:00:00.000Z" defaultTo="2026-02-03T09:30:00.000Z" />);

    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2026-03-01T00:00');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2026-03-02T06:15');
  });

  it('highlights Custom when no preset is set', () => {
    render(<DateRangePicker />);

    expect(isCustomSelected(screen.getByRole('button', { name: 'Custom' }))).toBe(true);
    expect(isPresetSelected(screen.getByRole('button', { name: 'Last 7d' }))).toBe(false);
  });

  it('editing From writes the new value, keeps To, and clears any preset', () => {
    nav.search = 'to=2026-03-02T06:15:00.000Z';

    render(<DateRangePicker />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-03-01T10:45' } });

    const url = lastUrl();
    expect(url.searchParams.get('from')).toBe('2026-03-01T10:45');
    expect(url.searchParams.get('to')).toBe('2026-03-02T06:15:00.000Z');
    expect(url.searchParams.has('preset')).toBe(false);
  });

  it('editing To writes the new value and keeps From', () => {
    nav.search = 'from=2026-03-01T00:00:00.000Z';

    render(<DateRangePicker />);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03-05T18:00' } });

    const url = lastUrl();
    expect(url.searchParams.get('from')).toBe('2026-03-01T00:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-03-05T18:00');
  });

  it('clicking Custom drops the preset but keeps the current from/to', () => {
    nav.search = 'preset=7d&from=2026-06-08T12:00:00.000Z&to=2026-06-15T12:00:00.000Z';

    render(<DateRangePicker />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    const url = lastUrl();
    expect(url.searchParams.has('preset')).toBe(false);
    expect(url.searchParams.get('from')).toBe('2026-06-08T12:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-06-15T12:00:00.000Z');
  });

  it('builds the URL from the current pathname and appends a custom className', () => {
    nav.pathname = '/events';

    const { container } = render(<DateRangePicker className="extra-class" />);
    fireEvent.click(screen.getByRole('button', { name: 'Last hour' }));

    expect(lastUrl().pathname).toBe('/events');
    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
  });
});
