'use client';

import { ReactNode } from 'react';

type Shadow = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  shadow?: Shadow;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

const shadowClasses: Record<Shadow, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export default function Card({
  children,
  header,
  footer,
  shadow = 'sm',
  clickable = false,
  onClick,
  className = '',
}: CardProps) {
  const Tag = clickable ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={[
        'w-full rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 text-left',
        shadowClasses[shadow],
        clickable
          ? 'cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          {header}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          {footer}
        </div>
      )}
    </Tag>
  );
}
