import useSWR from 'swr';

export interface UseApiOptions {
  /** Poll every N ms. SWR already pauses this while the tab is hidden. */
  refreshInterval?: number;
}

export interface UseApiResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Thin wrapper over SWR giving every dashboard the same
 * data/error/isLoading/refetch shape. `key` doubles as the SWR cache key —
 * pass `null` to skip fetching (e.g. while required params are missing).
 */
export function useApi<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher, {
    refreshInterval: options.refreshInterval,
  });

  return {
    data,
    error,
    isLoading,
    refetch: () => {
      void mutate();
    },
  };
}

/** Builds a stable SWR key from an endpoint name and its params. */
export function buildApiKey(endpoint: string, params: Record<string, unknown>): string {
  return `${endpoint}?${JSON.stringify(params, Object.keys(params).sort())}`;
}
