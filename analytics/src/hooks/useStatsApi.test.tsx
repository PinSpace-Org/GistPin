import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

vi.mock('@/lib/api/client', () => ({
  getOverview: vi.fn(),
  getGistsTimeseries: vi.fn(),
  getAuthorsTop: vi.fn(),
  getAuthorsTimeseries: vi.fn(),
  getEventsStats: vi.fn(),
  getModerationStats: vi.fn(),
  getAuthorConcentration: vi.fn(),
  getPostsPerAuthorDistribution: vi.fn(),
  getNewVsReturningAuthors: vi.fn(),
  getIndexerStats: vi.fn(),
}));

import * as client from '@/lib/api/client';
import {
  useAuthorConcentration,
  useAuthorsTimeseries,
  useAuthorsTop,
  useEventsStats,
  useGistsTimeseries,
  useIndexerStats,
  useModerationStats,
  useNewVsReturningAuthors,
  useOverview,
  usePostsPerAuthorDistribution,
} from './useStatsApi';

type Fn = ReturnType<typeof vi.fn>;
const mocked = (fn: unknown) => fn as Fn;

function wrapper({ children }: { children: ReactNode }) {
  // A fresh SWR cache per test so results don't leak between tests.
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

// The params shapes are irrelevant to these tests; the hooks only forward them.
const params = (value: Record<string, unknown>) => value as never;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('useStatsApi hooks forward to the matching client function', () => {
  const noParamCases: [string, () => { data: unknown }, unknown][] = [
    ['useOverview', () => useOverview(), client.getOverview],
    ['useAuthorsTop', () => useAuthorsTop(), client.getAuthorsTop],
    ['useAuthorConcentration', () => useAuthorConcentration(), client.getAuthorConcentration],
    ['useIndexerStats', () => useIndexerStats(), client.getIndexerStats],
  ];

  it.each(noParamCases)('%s calls its endpoint and returns the data', async (_name, useHook, fn) => {
    mocked(fn).mockResolvedValue({ marker: _name });

    const { result } = renderHook(useHook, { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ marker: _name }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith();
  });

  const paramCases: [string, (p: never) => { data: unknown }, unknown][] = [
    ['useGistsTimeseries', useGistsTimeseries, client.getGistsTimeseries],
    ['useAuthorsTimeseries', useAuthorsTimeseries, client.getAuthorsTimeseries],
    ['useEventsStats', useEventsStats, client.getEventsStats],
    ['useModerationStats', useModerationStats, client.getModerationStats],
    ['usePostsPerAuthorDistribution', usePostsPerAuthorDistribution, client.getPostsPerAuthorDistribution],
    ['useNewVsReturningAuthors', useNewVsReturningAuthors, client.getNewVsReturningAuthors],
  ];

  it.each(paramCases)('%s passes its params to the client and returns the data', async (name, useHook, fn) => {
    mocked(fn).mockResolvedValue({ marker: name });
    const p = params({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z', bucket: 'day' });

    const { result } = renderHook(() => useHook(p), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ marker: name }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(p);
  });
});

describe('useStatsApi cache keys', () => {
  it('does not share cache between endpoints that take no params', async () => {
    mocked(client.getAuthorsTop).mockResolvedValue({ kind: 'top' });
    mocked(client.getAuthorConcentration).mockResolvedValue({ kind: 'concentration' });

    const { result } = renderHook(
      () => ({ top: useAuthorsTop(), concentration: useAuthorConcentration() }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.top.data).toEqual({ kind: 'top' });
      expect(result.current.concentration.data).toEqual({ kind: 'concentration' });
    });
  });

  it('does not share cache between endpoints that take identical params', async () => {
    const p = params({ from: 'a', to: 'b', bucket: 'day' });
    mocked(client.getEventsStats).mockResolvedValue({ kind: 'events' });
    mocked(client.getModerationStats).mockResolvedValue({ kind: 'moderation' });

    const { result } = renderHook(
      () => ({ events: useEventsStats(p), moderation: useModerationStats(p) }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.events.data).toEqual({ kind: 'events' });
      expect(result.current.moderation.data).toEqual({ kind: 'moderation' });
    });
  });

  it('refetches when the params change', async () => {
    mocked(client.getEventsStats).mockImplementation(async (p: { bucket: string }) => ({ bucket: p.bucket }));

    const { result, rerender } = renderHook(({ p }) => useEventsStats(p), {
      wrapper,
      initialProps: { p: params({ bucket: 'hour' }) },
    });
    await waitFor(() => expect(result.current.data).toEqual({ bucket: 'hour' }));

    rerender({ p: params({ bucket: 'day' }) });

    await waitFor(() => expect(result.current.data).toEqual({ bucket: 'day' }));
    expect(client.getEventsStats).toHaveBeenCalledTimes(2);
  });

  it('treats params with the same values in a different key order as the same request', async () => {
    mocked(client.getEventsStats).mockResolvedValue({ ok: true });

    const { result, rerender } = renderHook(({ p }) => useEventsStats(p), {
      wrapper,
      initialProps: { p: params({ from: 'a', to: 'b' }) },
    });
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));

    rerender({ p: params({ to: 'b', from: 'a' }) });

    expect(result.current.data).toEqual({ ok: true });
    expect(client.getEventsStats).toHaveBeenCalledTimes(1);
  });
});

describe('useStatsApi error handling', () => {
  it('exposes the error when the client call rejects', async () => {
    mocked(client.getOverview).mockRejectedValue(new Error('stats unavailable'));

    const { result } = renderHook(() => useOverview(), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.message).toBe('stats unavailable');
    expect(result.current.data).toBeUndefined();
  });
});
