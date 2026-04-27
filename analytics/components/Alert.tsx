'use client';

import { ReactNode, useState } from 'react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  icon?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}

const styles: Record<AlertType, { container: string; icon: string; defaultIcon: string }> = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    icon: 'text-blue-500',
    defaultIcon: 'ℹ',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    icon: 'text-green-500',
    defaultIcon: '✓',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    icon: 'text-yellow-500',
    defaultIcon: '⚠',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    icon: 'text-red-500',
    defaultIcon: '✕',
  },
};

export default function Alert({
  type = 'info',
  title,
  children,
  dismissible = false,
  icon,
  action,
  onDismiss,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const s = styles[type];

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-lg border p-4 text-sm ${s.container}`}
    >
      <span className={`mt-0.5 shrink-0 font-bold ${s.icon}`}>
        {icon ?? s.defaultIcon}
      </span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}
