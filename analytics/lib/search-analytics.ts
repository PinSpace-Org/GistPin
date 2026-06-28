export interface SearchQuery {
  term: string;
  timestamp: Date;
  userId?: string;
  filters?: Record<string, string>;
  resultCount: number;
  clickCount: number;
}

export interface SearchAggregation {
  term: string;
  totalSearches: number;
  uniqueUsers: number;
  avgResultCount: number;
  clickThroughRate: number;
  lastSearched: Date;
}

export function aggregateSearches(queries: SearchQuery[]): SearchAggregation[] {
  const grouped = new Map<string, SearchQuery[]>();
  for (const q of queries) {
    const key = q.term.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(q);
  }

  return Array.from(grouped.entries()).map(([term, entries]) => {
    const uniqueUsers = new Set(entries.map(e => e.userId).filter(Boolean)).size;
    const totalSearches = entries.length;
    const avgResultCount = entries.reduce((s, e) => s + e.resultCount, 0) / totalSearches;
    const totalClicks = entries.reduce((s, e) => s + e.clickCount, 0);
    const clickThroughRate = totalSearches > 0 ? totalClicks / totalSearches : 0;
    const lastSearched = entries.reduce((latest, e) =>
      e.timestamp > latest ? e.timestamp : latest, entries[0].timestamp
    );

    return {
      term,
      totalSearches,
      uniqueUsers,
      avgResultCount: parseFloat(avgResultCount.toFixed(2)),
      clickThroughRate: parseFloat(clickThroughRate.toFixed(4)),
      lastSearched
    };
  }).sort((a, b) => b.totalSearches - a.totalSearches);
}

export function searchVolumeByDay(queries: SearchQuery[]): Map<string, number> {
  const volume = new Map<string, number>();
  for (const q of queries) {
    const day = q.timestamp.toISOString().slice(0, 10);
    volume.set(day, (volume.get(day) || 0) + 1);
  }
  return volume;
}

export function topSearchTerms(aggregations: SearchAggregation[], limit = 10): SearchAggregation[] {
  return aggregations.slice(0, limit);
}
