'use client';

import { useState } from 'react';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

const DIMENSIONS = ['Date', 'Location', 'Category'] as const;
const METRICS = ['Count', 'Average', 'Sum'] as const;
const FILTER_OPS = ['Greater than', 'Less than', 'Equals'] as const;

type Dimension = typeof DIMENSIONS[number];
type Metric = typeof METRICS[number];
type FilterOp = typeof FILTER_OPS[number];

interface Filter {
  id: number;
  dimension: Dimension;
  op: FilterOp;
  value: string;
}

interface SavedQuery {
  id: number;
  name: string;
  dimensions: Dimension[];
  metrics: Metric[];
  filters: Filter[];
}

const SAMPLE_RESULTS = [
  { Date: '2026-03-24', Location: 'New York',    Category: 'Alert',  Count: 142, Average: 71,  Sum: 10082 },
  { Date: '2026-03-25', Location: 'London',      Category: 'Tip',    Count: 98,  Average: 49,  Sum: 4802  },
  { Date: '2026-03-26', Location: 'Tokyo',       Category: 'Event',  Count: 213, Average: 107, Sum: 22791 },
  { Date: '2026-03-27', Location: 'Sydney',      Category: 'Alert',  Count: 67,  Average: 34,  Sum: 2278  },
  { Date: '2026-03-28', Location: 'São Paulo',   Category: 'Tip',    Count: 189, Average: 95,  Sum: 17955 },
];

let nextFilterId = 1;
let nextQueryId = 1;

export default function QueryBuilderPage() {
  const [selectedDimensions, setSelectedDimensions] = useState<Dimension[]>(['Date']);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['Count']);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [results, setResults] = useState<typeof SAMPLE_RESULTS | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [saveName, setSaveName] = useState('');

  function toggleDimension(d: Dimension) {
    setSelectedDimensions((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function toggleMetric(m: Metric) {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function addFilter() {
    setFilters((prev) => [...prev, { id: nextFilterId++, dimension: 'Date', op: 'Equals', value: '' }]);
  }

  function updateFilter(id: number, patch: Partial<Filter>) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }

  function runQuery() {
    setResults(SAMPLE_RESULTS);
  }

  function saveQuery() {
    const name = saveName.trim();
    if (!name) return;
    setSavedQueries((prev) => [
      ...prev,
      { id: nextQueryId++, name, dimensions: selectedDimensions, metrics: selectedMetrics, filters },
    ]);
    setSaveName('');
  }

  function loadQuery(q: SavedQuery) {
    setSelectedDimensions(q.dimensions);
    setSelectedMetrics(q.metrics);
    setFilters(q.filters);
    setResults(null);
  }

  const visibleColumns = [...selectedDimensions, ...selectedMetrics];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Query Builder</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dimensions */}
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Dimensions</h2>
          <div className="space-y-2">
            {DIMENSIONS.map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDimensions.includes(d)}
                  onChange={() => toggleDimension(d)}
                  className="accent-indigo-500"
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Metrics</h2>
          <div className="space-y-2">
            {METRICS.map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(m)}
                  onChange={() => toggleMetric(m)}
                  className="accent-indigo-500"
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Filters</h2>
          <div className="space-y-2">
            {filters.map((f) => (
              <div key={f.id} className="flex gap-1 items-center flex-wrap">
                <select
                  value={f.dimension}
                  onChange={(e) => updateFilter(f.id, { dimension: e.target.value as Dimension })}
                  className="border rounded px-1 py-0.5 text-sm bg-transparent"
                >
                  {DIMENSIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <select
                  value={f.op}
                  onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })}
                  className="border rounded px-1 py-0.5 text-sm bg-transparent"
                >
                  {FILTER_OPS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input
                  value={f.value}
                  onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                  placeholder="value"
                  className="border rounded px-1 py-0.5 text-sm w-20 bg-transparent"
                />
                <button onClick={() => removeFilter(f.id)} className="text-red-500 text-xs">✕</button>
              </div>
            ))}
            <button
              onClick={addFilter}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Add filter
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={runQuery}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Run Query
        </button>
        <input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Query name…"
          className="border rounded-lg px-3 py-2 text-sm bg-transparent"
        />
        <button
          onClick={saveQuery}
          disabled={!saveName.trim()}
          className="px-4 py-2 border border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-40 transition-colors"
        >
          Save Query
        </button>
        {results && (
          <ExportButton
            onExport={(onProgress) =>
              exportRowsToCsv({
                filenamePrefix: 'query-results',
                rows: results.map((r) =>
                  Object.fromEntries(visibleColumns.map((c) => [c, (r as Record<string, string | number | boolean | null>)[c] ?? '']))
                ),
                onProgress,
              })
            }
          />
        )}
      </div>

      {savedQueries.length > 0 && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Saved Queries</h2>
          <div className="flex flex-wrap gap-2">
            {savedQueries.map((q) => (
              <button
                key={q.id}
                onClick={() => loadQuery(q)}
                className="px-3 py-1 rounded-full border text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
              >
                {q.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm overflow-x-auto">
          <h2 className="font-semibold mb-4">Results</h2>
          {visibleColumns.length === 0 ? (
            <p className="text-sm text-gray-500">Select at least one dimension or metric.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  {visibleColumns.map((c) => <th key={c} className="pb-2 pr-6">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {visibleColumns.map((c) => (
                      <td key={c} className="py-2 pr-6">{String((row as Record<string, unknown>)[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
