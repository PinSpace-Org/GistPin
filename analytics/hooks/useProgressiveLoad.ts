import { useState, useEffect } from 'react';
import { progressiveFetchers } from '@/lib/api';

type Stage = 'kpis' | 'simple' | 'complex';

interface ProgressiveState {
  kpis: Awaited<ReturnType<typeof progressiveFetchers.kpis>> | null;
  simple: Awaited<ReturnType<typeof progressiveFetchers.simple>> | null;
  complex: Awaited<ReturnType<typeof progressiveFetchers.complex>> | null;
  loaded: Stage[];
}

export function useProgressiveLoad() {
  const [state, setState] = useState<ProgressiveState>({
    kpis: null, simple: null, complex: null, loaded: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const kpis = await progressiveFetchers.kpis();
      if (cancelled) return;
      setState(s => ({ ...s, kpis, loaded: [...s.loaded, 'kpis'] }));

      const simple = await progressiveFetchers.simple();
      if (cancelled) return;
      setState(s => ({ ...s, simple, loaded: [...s.loaded, 'simple'] }));

      const complex = await progressiveFetchers.complex();
      if (cancelled) return;
      setState(s => ({ ...s, complex, loaded: [...s.loaded, 'complex'] }));
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
