'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview' },
  { href: '/overview/adoption-rate', label: 'Signed Adoption Rate' },
  { href: '/geospatial', label: 'Geospatial' },
  { href: '/time', label: 'Time' },
  { href: '/time/signed-anonymous', label: 'Signed vs Anonymous' },
  { href: '/content', label: 'Content' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/moderation/action-mix', label: 'Action Mix' },
  { href: '/moderation/moderator-card', label: 'Moderator Card' },
  { href: '/moderation/reports-over-time', label: 'Reports Over Time' },
  { href: '/authors', label: 'Authors' },
  { href: '/authors/concentration', label: 'Author Concentration' },
  { href: '/authors/distribution', label: 'Posts Distribution' },
  { href: '/authors/new-vs-returning', label: 'New vs Returning' },
  { href: '/onchain', label: 'On-chain' },
  { href: '/onchain/event-type-mix', label: 'Event Type Mix' },
  { href: '/onchain/events-by-type', label: 'Events by Type' },
  { href: '/onchain/events-feed', label: 'Events Feed' },
  { href: '/system', label: 'System Health' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col">
      <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/overview" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          GistPin Analytics
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          GistPin Analytics Dashboard
        </p>
      </div>
    </aside>
  );
}