'use client';

const SLOW_QUERIES = [
  {
    sql: "SELECT * FROM gists WHERE location && ST_MakeEnvelope($1,$2,$3,$4,4326)",
    ms: 1234,
    rows: 48_200,
    indexUsed: false,
    suggestion: 'Add a spatial GiST index on the location column.',
  },
  {
    sql: "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'",
    ms: 890,
    rows: 120_000,
    indexUsed: false,
    suggestion: 'Add an index on created_at or use a materialized view for counts.',
  },
  {
    sql: "SELECT * FROM gists ORDER BY created_at DESC LIMIT 100",
    ms: 654,
    rows: 980_000,
    indexUsed: true,
    suggestion: 'Index exists but query scans too many rows — add a partial index with a WHERE clause.',
  },
  {
    sql: "SELECT u.*, COUNT(g.id) FROM users u LEFT JOIN gists g ON g.user_id = u.id GROUP BY u.id",
    ms: 512,
    rows: 75_000,
    indexUsed: true,
    suggestion: 'Cache aggregated counts in a summary table updated via trigger.',
  },
  {
    sql: "SELECT * FROM gists WHERE tags @> ARRAY[$1]",
    ms: 340,
    rows: 22_000,
    indexUsed: false,
    suggestion: 'Add a GIN index on the tags array column.',
  },
];

const HISTORY = [
  { week: 'W1', avg: 980 },
  { week: 'W2', avg: 1050 },
  { week: 'W3', avg: 1120 },
  { week: 'W4', avg: 1234 },
];

const maxMs = Math.max(...SLOW_QUERIES.map((q) => q.ms));

export default function DbPerformancePage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Database Query Performance</h1>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        Slowest queries ranked by execution time with optimization suggestions.
      </p>

      <div style={{ display: 'grid', gap: 20 }}>
        {SLOW_QUERIES.map((q, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '20px 22px',
              boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: q.ms > 1000 ? '#ef4444' : q.ms > 600 ? '#f59e0b' : '#6366f1',
                }}
              >
                {q.ms.toLocaleString()} ms
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: q.indexUsed ? '#dcfce7' : '#fee2e2',
                  color: q.indexUsed ? '#15803d' : '#b91c1c',
                }}
              >
                {q.indexUsed ? 'Index used' : 'No index'}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {q.rows.toLocaleString()} rows scanned
              </span>
            </div>

            {/* SQL */}
            <code
              style={{
                display: 'block',
                background: '#f8fafc',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#334155',
                marginBottom: 10,
                wordBreak: 'break-all',
              }}
            >
              {q.sql}
            </code>

            {/* Flame bar */}
            <div style={{ height: 6, borderRadius: 999, background: '#f1f5f9', marginBottom: 10 }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  width: `${(q.ms / maxMs) * 100}%`,
                  background: q.ms > 1000 ? '#ef4444' : q.ms > 600 ? '#f59e0b' : '#6366f1',
                }}
              />
            </div>

            {/* Suggestion */}
            <div style={{ fontSize: 13, color: '#475569' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Suggestion: </span>
              {q.suggestion}
            </div>
          </div>
        ))}
      </div>

      {/* Historical trend */}
      <div
        style={{
          marginTop: 32,
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Avg Query Time — Last 4 Weeks</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 80 }}>
          {HISTORY.map((h) => {
            const maxH = Math.max(...HISTORY.map((x) => x.avg));
            const pct = (h.avg / maxH) * 100;
            return (
              <div key={h.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{h.avg}ms</span>
                <div
                  style={{
                    width: '100%',
                    height: `${pct}%`,
                    background: '#6366f1',
                    borderRadius: '6px 6px 0 0',
                    minHeight: 8,
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{h.week}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
