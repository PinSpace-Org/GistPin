'use client';

import { useMemo, useState } from 'react';

interface ErrorEntry {
  id: string;
  message: string;
  type: string;
  occurrences: number;
  affectedUsers: number;
  firstSeen: string;
  lastSeen: string;
  stackTrace: string[];
  history: number[];
}

const MOCK_ERRORS: ErrorEntry[] = [
  {
    id: 'err-1',
    message: "TypeError: Cannot read property 'map' of undefined",
    type: 'TypeError',
    occurrences: 47,
    affectedUsers: 23,
    firstSeen: '2026-03-20',
    lastSeen: '2026-03-30',
    stackTrace: [
      "  at GistList.render (GistList.tsx:42:18)",
      "  at processChild (react-dom.development.js:3990:14)",
      "  at resolve (react-dom.development.js:4020:5)",
      "  at ReactDOMServerRenderer.render (react-dom.development.js:4298:22)",
    ],
    history: [2, 5, 3, 8, 4, 6, 7, 5, 4, 3],
  },
  {
    id: 'err-2',
    message: 'NetworkError: Failed to fetch',
    type: 'NetworkError',
    occurrences: 23,
    affectedUsers: 18,
    firstSeen: '2026-03-22',
    lastSeen: '2026-03-30',
    stackTrace: [
      "  at fetchGists (api.ts:88:11)",
      "  at async GistMap.loadNearby (GistMap.tsx:115:5)",
      "  at async useEffect (GistMap.tsx:98:5)",
    ],
    history: [1, 2, 3, 2, 4, 3, 2, 1, 3, 2],
  },
  {
    id: 'err-3',
    message: 'ReferenceError: gist is not defined',
    type: 'ReferenceError',
    occurrences: 12,
    affectedUsers: 9,
    firstSeen: '2026-03-25',
    lastSeen: '2026-03-29',
    stackTrace: [
      "  at GistDetail (GistDetail.tsx:67:12)",
      "  at renderWithHooks (react-dom.development.js:14985:18)",
      "  at mountIndeterminateComponent (react-dom.development.js:17811:13)",
    ],
    history: [0, 1, 0, 2, 1, 2, 3, 1, 1, 1],
  },
];

const TYPE_COLORS: Record<string, string> = {
  TypeError: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  NetworkError: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  ReferenceError: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
};

function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-red-400 dark:bg-red-500 opacity-80"
          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
        />
      ))}
    </div>
  );
}

function ErrorRow({ error }: { error: ErrorEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[error.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {error.type}
            </span>
            <span className="text-xs text-gray-400">{error.occurrences} occurrences</span>
            <span className="text-xs text-gray-400">{error.affectedUsers} users affected</span>
          </div>
          <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{error.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            First seen: {error.firstSeen} · Last seen: {error.lastSeen}
          </p>
        </div>
        <div className="shrink-0 w-24">
          <MiniBarChart data={error.history} />
          <p className="text-[10px] text-gray-400 text-center mt-1">Last 10 days</p>
        </div>
        <svg
          width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 mt-1 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Stack Trace</p>
          <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {error.message}{'\n'}{error.stackTrace.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ErrorsPage() {
  const [filter, setFilter] = useState('All');
  const types = useMemo(() => ['All', ...Array.from(new Set(MOCK_ERRORS.map((e) => e.type)))], []);

  const filtered = useMemo(
    () => (filter === 'All' ? MOCK_ERRORS : MOCK_ERRORS.filter((e) => e.type === filter)),
    [filter],
  );

  const totalOccurrences = MOCK_ERRORS.reduce((s, e) => s + e.occurrences, 0);
  const totalUsers = MOCK_ERRORS.reduce((s, e) => s + e.affectedUsers, 0);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Errors', value: MOCK_ERRORS.length },
          { label: 'Total Occurrences', value: totalOccurrences },
          { label: 'Affected Users', value: totalUsers },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter by type */}
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === t
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Error list */}
      <div className="space-y-3">
        {filtered.map((error) => (
          <ErrorRow key={error.id} error={error} />
        ))}
      </div>
    </div>
  );
}
