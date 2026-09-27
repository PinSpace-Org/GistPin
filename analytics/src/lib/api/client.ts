import type {
  CountNearbyParams,
  CountNearbyResult,
  Gist,
  HealthResponse,
  ModeratorResponse,
  PaginatedResponse,
  QueryGistsParams,
  QueryTimeseriesParams,
  TimeseriesBucket,
  AuthorsTopResponse,
  AuthorsTimeseriesParams,
  AuthorsTimeseriesResponse,
  EventsStatsParams,
  EventsStatsResponse,
  ModerationStatsParams,
  ModerationStatsResponse,
  OverviewResponse,
  AuthorConcentrationResponse,
  PostsPerAuthorDistributionParams,
  PostsPerAuthorDistributionResponse,
  NewVsReturningAuthorsParams,
  NewVsReturningAuthorsResponse,
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

export function getOverview(options?: RequestOptions): Promise<OverviewResponse> {
  return request('/v1/stats/overview', options);
}

export function getGistsTimeseries(
  params: QueryTimeseriesParams,
  options?: RequestOptions,
): Promise<TimeseriesBucket[]> {
  return request(`/v1/stats/timeseries/gists${buildQuery(params)}`, options);
}

export function getAuthorsTop(options?: RequestOptions): Promise<AuthorsTopResponse> {
  return request('/v1/stats/authors', options);
}

export function getAuthorsTimeseries(
  params: AuthorsTimeseriesParams,
  options?: RequestOptions,
): Promise<AuthorsTimeseriesResponse> {
  return request(`/v1/stats/authors/timeseries${buildQuery(params)}`, options);
}

export function getEventsStats(
  params: EventsStatsParams,
  options?: RequestOptions,
): Promise<EventsStatsResponse> {
  return request(`/v1/stats/events${buildQuery(params)}`, options);
}

export function getModerationStats(
  params: ModerationStatsParams,
  options?: RequestOptions,
): Promise<ModerationStatsResponse> {
  return request(`/v1/stats/moderation${buildQuery(params)}`, options);
}

export function getAuthorConcentration(options?: RequestOptions): Promise<AuthorConcentrationResponse> {
  return request('/v1/stats/authors/concentration', options);
}

export function getPostsPerAuthorDistribution(
  params: PostsPerAuthorDistributionParams,
  options?: RequestOptions,
): Promise<PostsPerAuthorDistributionResponse> {
  return request(`/v1/stats/authors/distribution${buildQuery(params)}`, options);
}

export function getNewVsReturningAuthors(
  params: NewVsReturningAuthorsParams,
  options?: RequestOptions,
): Promise<NewVsReturningAuthorsResponse> {
  return request(`/v1/stats/authors/new-vs-returning${buildQuery(params)}`, options);
}
