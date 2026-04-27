'use client';

import { useState, useMemo } from 'react';

interface LocationRow {
  location: string;
  country: string;
  gists: number;
  growth: number; // % change vs last period
}

const locations: LocationRow[] = [
  { location: 'Lagos',         country: 'Nigeria',      gists: 1420, growth:  12.4 },
  { location: 'Abuja',         country: 'Nigeria',      gists:  980, growth:   8.1 },
  { location: 'Nairobi',       country: 'Kenya',        gists:  860, growth:  15.3 },
  { location: 'Accra',         country: 'Ghana',        gists:  740, growth:  -2.7 },
  { location: 'Kano',          country: 'Nigeria',      gists:  630, growth:   5.9 },
  { location: 'Cape Town',     country: 'South Africa', gists:  590, growth:  21.0 },
  { location: 'Ibadan',        country: 'Nigeria',      gists:  510, growth:  -4.1 },
  { location: 'Dar es Salaam', country: 'Tanzania',     gists:  470, growth:   9.8 },
  { location: 'Kampala',       country: 'Uganda',       gists:  430, growth:  18.6 },
  { location: 'Addis Ababa',   country: 'Ethiopia',     gists:  390, growth:   3.2 },
  { location: 'Dakar',         country: 'Senegal',      gists:  360, growth:  -1.5 },
  { location: 'Lusaka',        country: 'Zambia',       gists:  320, growth:   7.4 },
  { location: 'Harare',        country: 'Zimbabwe',     gists:  290, growth:  11.2 },
  { location: 'Kumasi',        country: 'Ghana',        gists:  260, growth:  -6.3 },
  { location: 'Mombasa',       country: 'Kenya',        gists:  240, growth:  14.7 },
];

type SortKey = 'rank' | 'location' | 'gists' | 'growth';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function TopLocationsTable() {
  const [sortKey, setSortKey] = useState<SortKey>('gists');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return locations.filter(r =>
      r.location.toLowerCase().includes(q) || r.country.toLowerCase().includes(q)
    );
  }, [search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rank' || sortKey === 'gists') cmp = a.gists - b.gists;
      else if (sortKey === 'growth')   cmp = a.growth - b.growth;
      else cmp = a.location.localeCompare(b.location);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function arrow(key: SortKey) {
    if (key !== sortKey) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const th: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
    color: '#6b7280', userSelect: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        placeholder="Search location or country…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 12,
          padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
          fontSize: 13, outline: 'none',
        }}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {(['rank', 'location', 'gists', 'growth'] as SortKey[]).map(key => (
                <th key={key} onClick={() => handleSort(key)} style={th}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}{arrow(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const rank = (page - 1) * PAGE_SIZE + i + 1;
              const growthColor = row.growth >= 0 ? '#16a34a' : '#dc2626';
              return (
                <tr key={row.location} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontWeight: 600 }}>{rank}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    {row.location}
                    <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                      {row.country}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{row.gists.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: growthColor, fontWeight: 600 }}>
                    {row.growth >= 0 ? '+' : ''}{row.growth.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}
          >
            ‹
          </button>
          <span style={{ color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
