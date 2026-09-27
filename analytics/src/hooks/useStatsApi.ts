'use client';

import {
  getOverview,
  getGistsTimeseries,
  getAuthorsTop,
  getAuthorsTimeseries,
  getEventsStats,
  getModerationStats,
} from '@/lib/api/client';
import type {
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
} from '@/lib/api/types';
import { buildApiKey, useApi, type UseApiOptions } from './useApi';

export function useOverview(options?: UseApiOptions) {
  return useApi<OverviewResponse>('overview', () => getOverview(), options);
}

export function useGistsTimeseries(params: QueryTimeseriesParams, options?: UseApiOptions) {
  return useApi<TimeseriesBucket[]>(
    buildApiKey('timeseries/gists', params),
    () => getGistsTimeseries(params),
    options,
  );
}

export function useAuthorsTop(options?: UseApiOptions) {
  return useApi<AuthorsTopResponse>('authors/top', () => getAuthorsTop(), options);
}

export function useAuthorsTimeseries(params: AuthorsTimeseriesParams, options?: UseApiOptions) {
  return useApi<AuthorsTimeseriesResponse>(
    buildApiKey('authors/timeseries', params),
    () => getAuthorsTimeseries(params),
    options,
  );
}

export function useEventsStats(params: EventsStatsParams, options?: UseApiOptions) {
  return useApi<EventsStatsResponse>(
    buildApiKey('events', params),
    () => getEventsStats(params),
    options,
  );
}

export function useModerationStats(params: ModerationStatsParams, options?: UseApiOptions) {
  return useApi<ModerationStatsResponse>(
    buildApiKey('moderation', params),
    () => getModerationStats(params),
    options,
  );
}