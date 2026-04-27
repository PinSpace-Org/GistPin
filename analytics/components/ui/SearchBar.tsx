'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchAnalytics, groupResults, highlightMatch, type SearchResult, type SearchResultType } from '@/lib/search';

const TYPE_LABELS: Record<SearchResultType, string> = {
  page: 'Pages',
  metric: 'Metrics',
  location: 'Locations',
  category: 'Categories',
};

interface SearchBarProps {
  /** Controlled open state (for keyboard shortcut integration) */
  open?: boolean;
  onClose?: () => void;
}

export default function SearchBar({ open: controlledOpen, onClose }: SearchBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setQuery('');
    setResults([]);
    setActiveIndex(0);
    setInternalOpen(false);
    onClose?.();
  }, [onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      setResults(searchAnalytics(query));
      setActiveIndex(0);
    }, 120);
    return () => clearTimeout(id);
  }, [query]);

  const navigate = useCallback(
    (result: SearchResult) => {
      if (result.href) router.push(result.href);
      close();
    },
    [router, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && results[activeIndex]) { navigate(results[activeIndex]); }
    },
    [results, activeIndex, navigate, close],
  );

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setInternalOpen(true)}
        aria-label="Search (Ctrl+K)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          color: '#94a3b8',
          padding: '5px 10px',
          fontSize: 13,
          cursor: 'pointer',
          minWidth: 160,
        }}
      >
        <SearchIcon />
        <span>Search…</span>
        <kbd style={{ marginLeft: 'auto', fontSize: 10, background: '#e2e8f0', borderRadius: 4, padding: '1px 5px', color: '#64748b' }}>
          ⌘K
        </kbd>
      </button>
    );
  }

  const groups = groupResults(results);
  const orderedTypes: SearchResultType[] = ['page', 'metric', 'location', 'category'];
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.4)' }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Search"
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 210,
          width: 'min(560px, 92vw)',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search metrics, locations, pages…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              background: 'transparent',
              color: '#0f172a',
            }}
            aria-label="Search query"
          />
          <kbd
            onClick={close}
            style={{ fontSize: 11, background: '#f1f5f9', borderRadius: 6, padding: '2px 7px', color: '#64748b', cursor: 'pointer' }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
            {orderedTypes.map((type) => {
              const items = groups[type];
              if (items.length === 0) return null;
              return (
                <div key={type}>
                  <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    {TYPE_LABELS[type]}
                  </div>
                  {items.map((item) => {
                    const idx = flatIndex++;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 16px',
                          border: 'none',
                          background: isActive ? '#f1f5f9' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <TypeIcon type={type} />
                        <div>
                          <div
                            style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}
                            dangerouslySetInnerHTML={{ __html: highlightMatch(item.label, query) }}
                          />
                          {item.description && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>{item.description}</div>
                          )}
                        </div>
                        {item.href && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>↵</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {query.length > 0 && results.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {query.length === 0 && (
          <div style={{ padding: '16px', fontSize: 12, color: '#94a3b8' }}>
            Type to search metrics, locations, categories, and pages…
          </div>
        )}
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TypeIcon({ type }: { type: SearchResultType }) {
  const color = type === 'page' ? '#6366f1' : type === 'metric' ? '#0ea5e9' : type === 'location' ? '#22c55e' : '#f59e0b';
  const size = 28;
  return (
    <span style={{ width: size, height: size, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {type === 'page' && <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></>}
        {type === 'metric' && <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>}
        {type === 'location' && <><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></>}
        {type === 'category' && <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></>}
      </svg>
    </span>
  );
}
