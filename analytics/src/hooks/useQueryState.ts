'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parseParam, serializeParam, type QueryParamSchema } from '@/lib/query-state';

export interface SetQueryStateOptions {
  /** Use router.push instead of the default router.replace. */
  push?: boolean;
}

/**
 * Reads/writes one typed query param through the Next.js router, without a
 * full page reload. Invalid or missing values fall back to the schema's
 * default instead of throwing.
 */
export function useQueryState<T>(
  key: string,
  schema: QueryParamSchema<T>,
): [T, (value: T, options?: SetQueryStateOptions) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo(
    () => parseParam<T>(searchParams.get(key), schema),
    [searchParams, key, schema],
  );

  const setValue = useCallback(
    (next: T, options?: SetQueryStateOptions) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, serializeParam(next, schema));
      const url = `${pathname}?${params.toString()}`;
      if (options?.push) router.push(url);
      else router.replace(url);
    },
    [router, pathname, searchParams, key, schema],
  );

  return [value, setValue];
}
