'use client';

import { useMemo, useState } from 'react';
import glossaryData from '@/data/glossary.json';

interface GlossaryTerm {
  id: string;
  term: string;
  full: string;
  category: string;
  definition: string;
  example: string;
  related: string[];
}

const TERMS: GlossaryTerm[] = glossaryData as GlossaryTerm[];
const CATEGORIES = ['All', ...Array.from(new Set(TERMS.map((t) => t.category))).sort()];

const CHART_LINKS: Record<string, string> = {
  dau: '/funnel',
  mau: '/funnel',
  stickiness: '/funnel',
  retention_rate: '/funnel',
  funnel: '/funnel',
  heatmap: '/query-builder',
  geofence: '/query-builder',
  arpu: '/campaigns',
  mrr: '/campaigns',
  ltv: '/campaigns',
  anomaly: '/errors',
};

export default function GlossaryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TERMS.filter((t) => {
      const matchCat = category === 'All' || t.category === category;
      const matchSearch =
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.full.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [filtered]);

  function relatedTerm(id: string) {
    return TERMS.find((t) => t.id === id);
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Analytics Glossary</h1>
      <p style={{ color: '#475569', marginBottom: 28 }}>
        Definitions, examples, and context for every metric used across the dashboard.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <input
          type="search"
          placeholder="Search terms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search glossary"
          style={{
            flex: '1 1 220px',
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: category === cat ? '#6366f1' : '#e2e8f0',
                background: category === cat ? '#6366f1' : '#fff',
                color: category === cat ? '#fff' : '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
          No terms match your search.
        </p>
      )}

      {/* Grouped term list */}
      {Array.from(grouped.entries()).map(([cat, terms]) => (
        <section key={cat} style={{ marginBottom: 36 }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 12,
            }}
          >
            {cat}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {terms.map((t) => {
              const isOpen = expanded === t.id;
              const chartLink = CHART_LINKS[t.id];
              return (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid',
                    borderColor: isOpen ? '#6366f1' : '#e2e8f0',
                    background: '#fff',
                    overflow: 'hidden',
                    boxShadow: isOpen ? '0 4px 16px rgba(99,102,241,0.08)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 18px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        minWidth: 72,
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#1e293b',
                      }}
                    >
                      {t.term}
                    </span>
                    <span style={{ fontSize: 13, color: '#64748b', flex: 1 }}>{t.full}</span>
                    <span
                      style={{
                        fontSize: 18,
                        color: '#94a3b8',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        lineHeight: 1,
                      }}
                      aria-hidden
                    >
                      ›
                    </span>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 18px 18px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <p style={{ fontSize: 14, color: '#334155', marginTop: 12, lineHeight: 1.6 }}>
                        {t.definition}
                      </p>
                      <div
                        style={{
                          marginTop: 10,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        <strong style={{ color: '#1e293b' }}>Example: </strong>
                        {t.example}
                      </div>

                      {/* Related terms + chart link */}
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {t.related.map((rid) => {
                          const rel = relatedTerm(rid);
                          return rel ? (
                            <button
                              key={rid}
                              onClick={() => setExpanded(rid)}
                              style={{
                                padding: '3px 10px',
                                borderRadius: 20,
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                fontSize: 12,
                                color: '#6366f1',
                                cursor: 'pointer',
                              }}
                            >
                              → {rel.term}
                            </button>
                          ) : null;
                        })}
                        {chartLink && (
                          <a
                            href={chartLink}
                            style={{
                              marginLeft: 'auto',
                              fontSize: 12,
                              color: '#6366f1',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            View chart ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
