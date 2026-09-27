'use client';

import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
          {description && <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
        </div>
        <div className="flex items-center gap-4 ml-4">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}