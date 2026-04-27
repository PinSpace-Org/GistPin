'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
}

function formatLabel(segment: string) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs({ items, homeLabel = 'Home' }: BreadcrumbsProps) {
  const pathname = usePathname();

  const crumbs: BreadcrumbItem[] = items ?? [
    { label: homeLabel, href: '/' },
    ...pathname
      .split('/')
      .filter(Boolean)
      .map((segment, i, arr) => ({
        label: formatLabel(segment),
        href: '/' + arr.slice(0, i + 1).join('/'),
      })),
  ];

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              {isLast ? (
                <span className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[160px] sm:max-w-none" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate max-w-[100px] sm:max-w-none hover:text-brand transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
