/**
 * Client-side fuzzy search for analytics data (issue #155).
 * Uses a lightweight manual implementation so no extra dependency is needed.
 */

export type SearchResultType = 'metric' | 'location' | 'category' | 'page';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  label: string;
  description?: string;
  href?: string;
}

// ── Static search index ───────────────────────────────────────────────────────

const STATIC_INDEX: SearchResult[] = [
  // Pages
  { id: 'page-overview',      type: 'page',     label: 'Overview',          description: 'Main dashboard',           href: '/' },
  { id: 'page-users',         type: 'page',     label: 'Users',             description: 'User growth & activity',   href: '/users' },
  { id: 'page-geographic',    type: 'page',     label: 'Geographic',        description: 'Location distribution',    href: '/geographic' },
  { id: 'page-export',        type: 'page',     label: 'Export',            description: 'Download analytics data',  href: '/export' },
  { id: 'page-comparison',    type: 'page',     label: 'Comparison',        description: 'Compare time periods',     href: '/comparison' },
  { id: 'page-reports',       type: 'page',     label: 'Reports',           description: 'Scheduled reports',        href: '/reports' },
  { id: 'page-report-builder',type: 'page',     label: 'Report Builder',    description: 'Build custom reports',     href: '/report-builder' },
  // Metrics
  { id: 'metric-total-gists', type: 'metric',   label: 'Total Gists',       description: 'Cumulative gist count' },
  { id: 'metric-today-gists', type: 'metric',   label: "Today's Gists",     description: 'Gists posted today' },
  { id: 'metric-active-users',type: 'metric',   label: 'Active Users',      description: 'Users active in last 24 h' },
  { id: 'metric-new-users',   type: 'metric',   label: 'New Users',         description: 'First-time users' },
  { id: 'metric-returning',   type: 'metric',   label: 'Returning Users',   description: 'Repeat visitors' },
  // Categories
  { id: 'cat-events',         type: 'category', label: 'Events',            description: 'Event gists' },
  { id: 'cat-food',           type: 'category', label: 'Food',              description: 'Food & dining gists' },
  { id: 'cat-safety',         type: 'category', label: 'Safety',            description: 'Safety alerts' },
  { id: 'cat-tips',           type: 'category', label: 'Tips',              description: 'Local tips' },
  { id: 'cat-news',           type: 'category', label: 'News',              description: 'News gists' },
  { id: 'cat-transit',        type: 'category', label: 'Transit',           description: 'Transport updates' },
  { id: 'cat-markets',        type: 'category', label: 'Markets',           description: 'Market information' },
  // Locations
  { id: 'loc-lagos',          type: 'location', label: 'Lagos',             description: 'Lagos activity' },
  { id: 'loc-abuja',          type: 'location', label: 'Abuja',             description: 'Abuja activity' },
  { id: 'loc-kano',           type: 'location', label: 'Kano',              description: 'Kano activity' },
  { id: 'loc-ibadan',         type: 'location', label: 'Ibadan',            description: 'Ibadan activity' },
  { id: 'loc-ph',             type: 'location', label: 'Port Harcourt',     description: 'Port Harcourt activity' },
  { id: 'loc-enugu',          type: 'location', label: 'Enugu',             description: 'Enugu activity' },
  { id: 'loc-kaduna',         type: 'location', label: 'Kaduna',            description: 'Kaduna activity' },
];

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return q.length / t.length + 1; // exact substring scores higher
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { score++; qi++; }
  }
  return qi === q.length ? score / t.length : 0;
}

/**
 * Search the static index plus any dynamic entries.
 * Returns results grouped by type, sorted by relevance.
 */
export function searchAnalytics(
  query: string,
  extra: SearchResult[] = [],
  limit = 8,
): SearchResult[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const all = [...STATIC_INDEX, ...extra];

  const scored = all
    .map((item) => {
      const labelScore = fuzzyScore(q, item.label) * 2;
      const descScore = item.description ? fuzzyScore(q, item.description) : 0;
      return { item, score: labelScore + descScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);

  return scored;
}

/** Group results by type for display. */
export function groupResults(
  results: SearchResult[],
): Record<SearchResultType, SearchResult[]> {
  const groups: Record<SearchResultType, SearchResult[]> = {
    page: [],
    metric: [],
    location: [],
    category: [],
  };
  for (const r of results) groups[r.type].push(r);
  return groups;
}

/** Wrap matching substring in a highlight marker. */
export function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<mark>${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length)
  );
}
