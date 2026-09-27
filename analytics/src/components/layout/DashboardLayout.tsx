'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
}

export function DashboardLayout({ children, title, description, headerAction }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={title} description={description} action={headerAction} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}