'use client';

import { ReactNode } from 'react';

type Variant = 'gray' | 'brand' | 'green' | 'yellow' | 'red' | 'blue';

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  pill?: boolean;
  count?: number;
}

const variantClasses: Record<Variant, string> = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  brand: 'bg-brand/10 text-brand dark:bg-brand/20',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const dotClasses: Record<Variant, string> = {
  gray: 'bg-gray-400',
  brand: 'bg-brand',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

export default function Badge({
  children,
  variant = 'gray',
  dot = false,
  pill = true,
  count,
}: BadgeProps) {
  if (count !== undefined) {
    return (
      <span
        className={`inline-flex min-w-[1.25rem] items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none ${variantClasses[variant]} ${pill ? 'rounded-full' : 'rounded'}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${pill ? 'rounded-full' : 'rounded'}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />
      )}
      {children}
    </span>
  );
}
