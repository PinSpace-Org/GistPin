import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, getGist, getGists, getHealth } from './client';

describe('api client', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GISTPIN_API_URL = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_GISTPIN_API_URL;
  });

  it('throws a clear error when the base URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_GISTPIN_API_URL;
    await expect(getHealth()).rejects.toThrow('NEXT_PUBLIC_GISTPIN_API_URL');
  });

  it('resolves with the parsed JSON body on success', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    const result = await getHealth();
    expect(result).toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1/health', expect.any(Object));
  });

  it('builds a query string from params, omitting undefined values', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { count: 0, cursor: null, hasMore: false } }),
    });

    await getGists({ lat: 6.5, lon: 3.3, radius: undefined });

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('lat=6.5');
    expect(url).toContain('lon=3.3');
    expect(url).not.toContain('radius');
  });

  it('rejects with a typed ApiError carrying the HTTP status on a non-2xx response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Gist not found' }),
    });

    await expect(getGist('missing-id')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Gist not found',
    });
  });

  it('rejects with a status-0 ApiError on a network failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fetch failed'));

    await expect(getHealth()).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('rejects with a status-0 ApiError when the request times out', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    await expect(getHealth({ timeoutMs: 5 })).rejects.toBeInstanceOf(ApiError);
  });
});
