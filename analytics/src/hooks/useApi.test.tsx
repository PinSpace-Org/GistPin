import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useApi, buildApiKey } from './useApi';

function wrapper({ children }: { children: ReactNode }) {
  // A fresh SWR cache per test so results don't leak between tests.
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe('useApi', () => {
  it('starts in a loading state with no data', () => {
    const fetcher = vi.fn(() => new Promise<string>(() => {})); // never resolves
    const { result } = renderHook(() => useApi('key-loading', fetcher), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('resolves to a success state with data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ status: 'ok' });
    const { result } = renderHook(() => useApi('key-success', fetcher), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ status: 'ok' });
    expect(result.current.error).toBeUndefined();
  });

  it('resolves to an error state when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi('key-error', fetcher), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe('boom');
  });

  it('refetch() re-invokes the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const { result } = renderHook(() => useApi('key-refetch', fetcher), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    result.current.refetch();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});

describe('buildApiKey', () => {
  it('produces the same key regardless of param insertion order', () => {
    const a = buildApiKey('gists', { lat: 1, lon: 2 });
    const b = buildApiKey('gists', { lon: 2, lat: 1 });
    expect(a).toBe(b);
  });

  it('produces different keys for different endpoints or params', () => {
    expect(buildApiKey('gists', { lat: 1 })).not.toBe(buildApiKey('gists/count', { lat: 1 }));
    expect(buildApiKey('gists', { lat: 1 })).not.toBe(buildApiKey('gists', { lat: 2 }));
  });
});
