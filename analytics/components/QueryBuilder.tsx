'use client';
import { useState } from 'react';

const DIMENSIONS = ['Date', 'Location', 'Category'] as const;
const METRICS = ['Count', 'Average', 'Sum'] as const;
const FILTER_OPS = ['Greater than', 'Less than', 'Equals'] as const;

type Dimension = (typeof DIMENSIONS)[number];
type Metric = (typeof METRICS)[number];
type FilterOp = (typeof FILTER_OPS)[number];

export interface QueryFilter {
  id: number;
  dimension: Dimension;
  op: FilterOp;
  value: string;
}

export interface SavedQuery {
  id: number;
  name: string;
  dimensions: Dimension[];
  metrics: Metric[];
  filters: QueryFilter[];
}

export interface QueryBuilderProps {
  onRun?: (dimensions: Dimension[], metrics: Metric[], filters: QueryFilter[]) => void;
  onSave?: (query: SavedQuery) => void;
  savedQueries?: SavedQuery[];
  onLoadQuery?: (query: SavedQuery) => void;
}

let nextFilterId = 1;
let nextQueryId = 1;

export default function QueryBuilder({
  onRun,
  onSave,
  savedQueries = [],
  onLoadQuery,
}: QueryBuilderProps) {
  const [selectedDimensions, setSelectedDimensions] = useState<Dimension[]>(['Date']);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['Count']);
  const [filters, setFilters] = useState<QueryFilter[]>([]);
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
    setFilters((prev) => [
      ...prev,
      { id: nextFilterId++, dimension: 'Date', op: 'Equals', value: '' },
    ]);
  }

  function updateFilter(id: number, patch: Partial<QueryFilter>) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }

  function handleRun() {
    onRun?.(selectedDimensions, selectedMetrics, filters);
  }

  function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    const query: SavedQuery = {
      id: nextQueryId++,
      name,
      dimensions: selectedDimensions,
      metrics: selectedMetrics,
      filters,
    };
    onSave?.(query);
    setSaveName('');
  }

  function handleLoad(q: SavedQuery) {
    setSelectedDimensions(q.dimensions);
    setSelectedMetrics(q.metrics);
    setFilters(q.filters);
    onLoadQuery?.(q);
  }

  return (
    <div className="space-y-6">
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
                  {DIMENSIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={f.op}
                  onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })}
                  className="border rounded px-1 py-0.5 text-sm bg-transparent"
                >
                  {FILTER_OPS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <input
                  value={f.value}
                  onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                  placeholder="value"
                  className="border rounded px-1 py-0.5 text-sm w-20 bg-transparent"
                />
                <button
                  onClick={() => removeFilter(f.id)}
                  className="text-red-500 text-xs"
                  aria-label="Remove filter"
                >
                  ✕
                </button>
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
          onClick={handleRun}
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
          onClick={handleSave}
          disabled={!saveName.trim()}
          className="px-4 py-2 border border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-40 transition-colors"
        >
          Save Query
        </button>
      </div>

      {savedQueries.length > 0 && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Saved Queries</h2>
          <div className="flex flex-wrap gap-2">
            {savedQueries.map((q) => (
              <button
                key={q.id}
                onClick={() => handleLoad(q)}
                className="px-3 py-1 rounded-full border text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
              >
                {q.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
