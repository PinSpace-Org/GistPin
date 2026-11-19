import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

vi.mock('@/lib/api/client', () => ({
  getGists: vi.fn(),
  getGistsCount: vi.fn(),
  getHealth: vi.fn(),
  getModerator: vi.fn(),
}));

import * as client from '@/lib/api/client';
import { useGists, useGistsCount, useHealth, useModerator } from './useGistsApi';

type Fn = ReturnType<typeof vi.fn>;
const mocked = (fn: unknown) => fn as Fn;

function wrapper({ children }: { children: ReactNode }) {
  // A fresh SWR cache per test so results don't leak between tests.
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

const params = (value: Record<string, unknown>) => value as never;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('useGists', () => {
  it('passes its params to getGists and returns the data', async () => {
    const p = params({ lat: 9.0579, lon: 7.4951, radius: 500 });
    mocked(client.getGists).mockResolvedValue({ data: [], pagination: {} });

    const { result } = renderHook(() => useGists(p), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ data: [], pagination: {} }));
    expect(client.getGists).toHaveBeenCalledWith(p);
  });

  it('refetches when the params change', async () => {
    mocked(client.getGists).mockImplementation(async (p: { radius: number }) => ({ radius: p.radius }));

    const { result, rerender } = renderHook(({ p }) => useGists(p), {
      wrapper,
      initialProps: { p: params({ lat: 1, lon: 2, radius: 100 }) },
    });
    await waitFor(() => expect(result.current.data).toEqual({ radius: 100 }));

    rerender({ p: params({ lat: 1, lon: 2, radius: 200 }) });

    await waitFor(() => expect(result.current.data).toEqual({ radius: 200 }));
    expect(client.getGists).toHaveBeenCalledTimes(2);
  });

  it('exposes the error when getGists rejects', async () => {
    mocked(client.getGists).mockRejectedValue(new Error('gists failed'));

    const { result } = renderHook(() => useGists(params({ lat: 1, lon: 2 })), { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe('gists failed'));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useGistsCount', () => {
  it('passes its params to getGistsCount and returns the data', async () => {
    const p = params({ lat: 9.0579, lon: 7.4951 });
    mocked(client.getGistsCount).mockResolvedValue({ count: 4 });

    const { result } = renderHook(() => useGistsCount(p), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ count: 4 }));
    expect(client.getGistsCount).toHaveBeenCalledWith(p);
  });
});

describe('useModerator and useHealth', () => {
  it('useModerator calls getModerator with no arguments', async () => {
    mocked(client.getModerator).mockResolvedValue({ moderatorAddress: 'GABC' });

    const { result } = renderHook(() => useModerator(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ moderatorAddress: 'GABC' }));
    expect(client.getModerator).toHaveBeenCalledWith();
  });

  it('useHealth calls getHealth with no arguments', async () => {
    mocked(client.getHealth).mockResolvedValue({ status: 'ok' });

    const { result } = renderHook(() => useHealth(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ status: 'ok' }));
    expect(client.getHealth).toHaveBeenCalledWith();
  });
});

describe('useGistsApi cache keys', () => {
  it('does not share cache between gists and gists/count for identical params', async () => {
    const p = params({ lat: 9.0579, lon: 7.4951 });
    mocked(client.getGists).mockResolvedValue({ kind: 'list' });
    mocked(client.getGistsCount).mockResolvedValue({ kind: 'count' });

    const { result } = renderHook(() => ({ list: useGists(p), count: useGistsCount(p) }), { wrapper });

    await waitFor(() => {
      expect(result.current.list.data).toEqual({ kind: 'list' });
      expect(result.current.count.data).toEqual({ kind: 'count' });
    });
  });

  it('does not share cache between the moderator and health hooks', async () => {
    mocked(client.getModerator).mockResolvedValue({ kind: 'moderator' });
    mocked(client.getHealth).mockResolvedValue({ kind: 'health' });

    const { result } = renderHook(() => ({ moderator: useModerator(), health: useHealth() }), { wrapper });

    await waitFor(() => {
      expect(result.current.moderator.data).toEqual({ kind: 'moderator' });
      expect(result.current.health.data).toEqual({ kind: 'health' });
    });
  });
});
