import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  pathname: '/stats',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import type { QueryParamSchema } from '@/lib/query-state';
import { useQueryState } from './useQueryState';

// Schemas are module constants: the hook memoises on schema identity.
const numberSchema: QueryParamSchema<number> = { type: 'number', defaultValue: 7 };
const bucketSchema: QueryParamSchema<string> = {
  type: 'enum',
  values: ['hour', 'day'],
  defaultValue: 'hour',
};
const stringSchema: QueryParamSchema<string> = { type: 'string', defaultValue: 'all' };

beforeEach(() => {
  nav.replace.mockClear();
  nav.push.mockClear();
  nav.pathname = '/stats';
  nav.search = '';
});

afterEach(() => {
  cleanup();
});

describe('useQueryState value', () => {
  it('returns the schema default when the param is missing', () => {
    const { result } = renderHook(() => useQueryState('days', numberSchema));

    expect(result.current[0]).toBe(7);
  });

  it('parses a number param', () => {
    nav.search = 'days=30';

    const { result } = renderHook(() => useQueryState('days', numberSchema));

    expect(result.current[0]).toBe(30);
  });

  it('falls back to the default for an invalid number', () => {
    nav.search = 'days=abc';

    const { result } = renderHook(() => useQueryState('days', numberSchema));

    expect(result.current[0]).toBe(7);
  });

  it('accepts an allowed enum value and falls back for an unknown one', () => {
    nav.search = 'bucket=day';
    const valid = renderHook(() => useQueryState('bucket', bucketSchema));
    expect(valid.result.current[0]).toBe('day');
    valid.unmount();

    nav.search = 'bucket=week';
    const invalid = renderHook(() => useQueryState('bucket', bucketSchema));
    expect(invalid.result.current[0]).toBe('hour');
  });

  it('reads only its own key', () => {
    nav.search = 'days=30&bucket=day';

    const { result } = renderHook(() => useQueryState('bucket', bucketSchema));

    expect(result.current[0]).toBe('day');
  });
});

describe('useQueryState setter', () => {
  it('replaces the URL with the serialised value by default', () => {
    const { result } = renderHook(() => useQueryState('days', numberSchema));

    act(() => result.current[1](14));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/stats?days=14');
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('keeps the other query params when setting one', () => {
    nav.search = 'bucket=day&from=2026-01-01';

    const { result } = renderHook(() => useQueryState('days', numberSchema));
    act(() => result.current[1](14));

    expect(nav.replace).toHaveBeenCalledWith('/stats?bucket=day&from=2026-01-01&days=14');
  });

  it('overwrites an existing value for its own key', () => {
    nav.search = 'bucket=hour';

    const { result } = renderHook(() => useQueryState('bucket', bucketSchema));
    act(() => result.current[1]('day'));

    expect(nav.replace).toHaveBeenCalledWith('/stats?bucket=day');
  });

  it('uses router.push instead of replace when push is requested', () => {
    const { result } = renderHook(() => useQueryState('q', stringSchema));

    act(() => result.current[1]('abc', { push: true }));

    expect(nav.push).toHaveBeenCalledWith('/stats?q=abc');
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('builds the URL from the current pathname', () => {
    nav.pathname = '/authors';

    const { result } = renderHook(() => useQueryState('days', numberSchema));
    act(() => result.current[1](3));

    expect(nav.replace).toHaveBeenCalledWith('/authors?days=3');
  });
});
