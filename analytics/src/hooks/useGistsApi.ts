import { getGists, getGistsCount, getHealth, getModerator } from '@/lib/api/client';
import type { CountNearbyParams, QueryGistsParams } from '@/lib/api/types';
import { buildApiKey, useApi, type UseApiOptions } from './useApi';

export function useGists(params: QueryGistsParams, options?: UseApiOptions) {
  return useApi(buildApiKey('gists', params), () => getGists(params), options);
}

export function useGistsCount(params: CountNearbyParams, options?: UseApiOptions) {
  return useApi(buildApiKey('gists/count', params), () => getGistsCount(params), options);
}

export function useModerator(options?: UseApiOptions) {
  return useApi('moderator', () => getModerator(), options);
}

export function useHealth(options?: UseApiOptions) {
  return useApi('health', () => getHealth(), options);
}
