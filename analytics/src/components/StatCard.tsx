'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ label, value, description, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 ${className}`}>
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
      {description && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
    </div>
  );
}