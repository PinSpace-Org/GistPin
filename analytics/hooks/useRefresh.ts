'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const AUTO_REFRESH_MS = 300_000;

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useRefresh() {
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const lastUpdatedLabel = useMemo(() => formatTimestamp(lastUpdated), [lastUpdated]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setLastUpdated(new Date());
    setIsRefreshing(false);
    setToast('Data refreshed successfully');
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void refresh(), AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return { lastUpdatedLabel, isRefreshing, autoRefresh, setAutoRefresh, toast, refresh };
}
