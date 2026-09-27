'use client';

import { forwardRef } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className = '', title, description, action }, ref) => (
  <div ref={ref} className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 ${className}`}>
    {(title || description || action) && (
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 p-4">
        <div>
          {title && <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>}
          {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
));
Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({ children, className = '' }, ref) => (
  <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
));
CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(({ children, className = '' }, ref) => (
  <h3 ref={ref} className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(({ children, className = '' }, ref) => (
  <p ref={ref} className={`text-sm text-neutral-500 dark:text-neutral-400 ${className}`}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ children, className = '' }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className}`}>{children}</div>
));
CardContent.displayName = 'CardContent';

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ children, className = '' }, ref) => (
  <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>
));
CardFooter.displayName = 'CardFooter';