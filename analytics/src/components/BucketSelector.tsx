'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface BucketSelectorProps {
  defaultBucket?: 'hour' | 'day';
  className?: string;
}

export function BucketSelector({ defaultBucket = 'hour', className = '' }: BucketSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bucket = (searchParams.get('bucket') as 'hour' | 'day') ?? defaultBucket;

  const handleChange = useCallback(
    (newBucket: 'hour' | 'day') => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('bucket', newBucket);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className={`flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 rounded-md ${className}`}>
      {(['hour', 'day'] as const).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => handleChange(b)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            bucket === b
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          {b.charAt(0).toUpperCase() + b.slice(1)}
        </button>
      ))}
    </div>
  );
}