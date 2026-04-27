'use client';

import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  label?: string;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  multiple = false,
  searchable = false,
  disabled = false,
  label,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = multiple
    ? (Array.isArray(value) ? value : [])
    : (typeof value === 'string' ? value : '');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const groups = Array.from(new Set(filtered.map((o) => o.group ?? ''))).filter(Boolean);
  const ungrouped = filtered.filter((o) => !o.group);

  const isSelected = (val: string) =>
    multiple ? (selected as string[]).includes(val) : selected === val;

  const toggle = (val: string) => {
    if (multiple) {
      const arr = selected as string[];
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
      onChange?.(next);
    } else {
      onChange?.(val);
      setOpen(false);
    }
  };

  const displayLabel = multiple
    ? (selected as string[]).length
      ? (selected as string[]).map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')
      : placeholder
    : options.find((o) => o.value === selected)?.label ?? placeholder;

  const renderOption = (opt: SelectOption) => (
    <button
      key={opt.value}
      type="button"
      disabled={opt.disabled}
      onClick={() => !opt.disabled && toggle(opt.value)}
      className={`w-full text-left px-3 py-1.5 text-sm rounded flex items-center gap-2 transition-colors ${
        opt.disabled
          ? 'opacity-40 cursor-not-allowed'
          : isSelected(opt.value)
          ? 'bg-brand/10 text-brand font-medium'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
      }`}
    >
      {multiple && (
        <span className={`h-3.5 w-3.5 rounded border ${isSelected(opt.value) ? 'bg-brand border-brand' : 'border-gray-300'}`} />
      )}
      {opt.label}
    </button>
  );

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{displayLabel}</span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto p-1">
            {ungrouped.map(renderOption)}
            {groups.map((group) => (
              <div key={group}>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group}</p>
                {filtered.filter((o) => o.group === group).map(renderOption)}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No options found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
