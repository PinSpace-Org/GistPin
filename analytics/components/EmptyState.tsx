'use client';

import { ReactNode } from 'react';

type Variant = 'default' | 'search' | 'error' | 'empty';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: Variant;
  className?: string;
}

const defaultIcons: Record<Variant, string> = {
  default: '📭',
  search: '🔍',
  error: '⚠️',
  empty: '🗂️',
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/30 ${className}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {icon ?? defaultIcons[variant]}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
