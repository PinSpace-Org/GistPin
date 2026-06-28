'use client';

import { useState, useEffect, useCallback } from 'react';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface SentimentSummary {
  overallScore: number;
  totalMentions: number;
  positivePercentage: number;
  negativePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface UseSentimentTrendOptions {
  period?: '7d' | '30d' | '90d';
  refreshInterval?: number;
}

export function useSentimentTrend(options: UseSentimentTrendOptions = {}) {
  const { period = '30d', refreshInterval = 300000 } = options;
  const [data, setData] = useState<SentimentDataPoint[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/sentiment?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch sentiment data');
      const json = await res.json();
      setData(json.data);
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchSentiment, refreshInterval]);

  return { data, summary, loading, error, refetch: fetchSentiment };
}
