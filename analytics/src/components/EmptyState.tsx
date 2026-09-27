'use client';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {icon && <div className="mb-4 text-neutral-400 dark:text-neutral-600">{icon}</div>}
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{title}</h3>
      {description && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}