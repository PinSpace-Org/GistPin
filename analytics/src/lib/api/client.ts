import type {
  CountNearbyParams,
  CountNearbyResult,
  Gist,
  HealthResponse,
  ModeratorResponse,
  PaginatedResponse,
  QueryGistsParams,
} from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  /** HTTP status, or 0 for a network failure/timeout (no response was received). */
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_GISTPIN_API_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_GISTPIN_API_URL is not set. See analytics/README.md for setup.',
    );
  }
  return url.replace(/\/+$/, '');
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  // Combine the caller's signal (if any) with our own timeout signal.
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, { signal: controller.signal });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out or was aborted', 0);
    }
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed', 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export function getGists(
  params: QueryGistsParams,
  options?: RequestOptions,
): Promise<PaginatedResponse<Gist>> {
  return request(`/v1/gists${buildQuery(params)}`, options);
}

export function getGistsCount(
  params: CountNearbyParams,
  options?: RequestOptions,
): Promise<CountNearbyResult> {
  return request(`/v1/gists/count${buildQuery(params)}`, options);
}

export function getGist(id: string, options?: RequestOptions): Promise<Gist> {
  return request(`/v1/gists/${id}`, options);
}

export function getModerator(options?: RequestOptions): Promise<ModeratorResponse> {
  return request('/v1/gists/moderator', options);
}

export function getHealth(options?: RequestOptions): Promise<HealthResponse> {
  return request('/v1/health', options);
}
