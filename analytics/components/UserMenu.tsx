'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface UserMenuProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  onSettings?: () => void;
  onLogout?: () => void;
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export default function UserMenu({
  name,
  email,
  avatarUrl,
  onSettings,
  onLogout,
  onThemeToggle,
  isDark = false,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} width={32} height={32} className="rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 z-50">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
            {email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>}
          </div>

          <ul className="py-1 text-sm">
            {onSettings && (
              <li>
                <button
                  onClick={() => { onSettings(); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  ⚙️ Settings
                </button>
              </li>
            )}
            {onThemeToggle && (
              <li>
                <button
                  onClick={() => { onThemeToggle(); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  {isDark ? '☀️ Light mode' : '🌙 Dark mode'}
                </button>
              </li>
            )}
            {onLogout && (
              <li>
                <button
                  onClick={() => { onLogout(); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  🚪 Log out
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
