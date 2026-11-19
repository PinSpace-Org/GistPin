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

import { BucketSelector } from './BucketSelector';

const isSelected = (el: HTMLElement) => el.className.includes('bg-blue-100');

beforeEach(() => {
  nav.replace.mockClear();
  nav.pathname = '/stats';
  nav.search = '';
});

afterEach(() => {
  cleanup();
});

describe('BucketSelector', () => {
  it('renders an Hour and a Day button', () => {
    render(<BucketSelector />);

    expect(screen.getByRole('button', { name: 'Hour' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Day' })).toBeDefined();
  });

  it('selects Hour by default', () => {
    render(<BucketSelector />);

    expect(isSelected(screen.getByRole('button', { name: 'Hour' }))).toBe(true);
    expect(isSelected(screen.getByRole('button', { name: 'Day' }))).toBe(false);
  });

  it('selects the bucket named by the defaultBucket prop when the URL has none', () => {
    render(<BucketSelector defaultBucket="day" />);

    expect(isSelected(screen.getByRole('button', { name: 'Day' }))).toBe(true);
    expect(isSelected(screen.getByRole('button', { name: 'Hour' }))).toBe(false);
  });

  it('prefers the bucket in the URL over defaultBucket', () => {
    nav.search = 'bucket=hour';

    render(<BucketSelector defaultBucket="day" />);

    expect(isSelected(screen.getByRole('button', { name: 'Hour' }))).toBe(true);
    expect(isSelected(screen.getByRole('button', { name: 'Day' }))).toBe(false);
  });

  it('writes the chosen bucket to the URL with router.replace', () => {
    render(<BucketSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/stats?bucket=day');
  });

  it('keeps the other query params and replaces an existing bucket', () => {
    nav.search = 'from=2026-01-01&bucket=day&preset=7d';

    render(<BucketSelector />);
    fireEvent.click(screen.getByRole('button', { name: 'Hour' }));

    expect(nav.replace).toHaveBeenCalledWith('/stats?from=2026-01-01&bucket=hour&preset=7d');
  });

  it('builds the URL from the current pathname', () => {
    nav.pathname = '/events';

    render(<BucketSelector />);
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));

    expect(nav.replace).toHaveBeenCalledWith('/events?bucket=day');
  });

  it('appends a custom className', () => {
    const { container } = render(<BucketSelector className="extra-class" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
  });
});
