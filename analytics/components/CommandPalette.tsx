'use client';

import { useEffect, useRef, useState } from 'react';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  recentIds?: string[];
  placeholder?: string;
}

function fuzzy(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette({ commands, recentIds = [], placeholder = 'Search commands…' }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const recent = recentIds
    .map((id) => commands.find((c) => c.id === id))
    .filter(Boolean) as Command[];

  const filtered = query
    ? commands.filter((c) => fuzzy(query, c.label) || fuzzy(query, c.description ?? ''))
    : recent.length
    ? recent
    : commands.slice(0, 8);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && filtered[cursor]) { filtered[cursor].onSelect(); setOpen(false); }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-gray-400">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-200"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
          {!query && recent.length > 0 && (
            <li className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent</li>
          )}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">No results</li>
          )}
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              role="option"
              aria-selected={i === cursor}
              onClick={() => { cmd.onSelect(); setOpen(false); }}
              onMouseEnter={() => setCursor(i)}
              className={[
                'flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors',
                i === cursor
                  ? 'bg-brand/10 text-brand dark:bg-brand/20'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {cmd.icon && <span className="text-base">{cmd.icon}</span>}
              <span className="flex-1 font-medium">{cmd.label}</span>
              {cmd.description && (
                <span className="text-xs text-gray-400 truncate max-w-[160px]">{cmd.description}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
