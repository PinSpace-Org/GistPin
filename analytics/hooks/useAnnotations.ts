'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteAnnotation,
  getAnnotations,
  saveAnnotation,
  updateAnnotation,
  type Annotation,
} from '@/lib/annotations';

export function useAnnotations(chartId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    setAnnotations(getAnnotations(chartId));
  }, [chartId]);

  const add = useCallback(
    (date: string, text: string) => {
      const next = saveAnnotation({ chartId, date, text });
      setAnnotations((prev) => [...prev, next]);
      return next;
    },
    [chartId],
  );

  const edit = useCallback(
    (id: string, patch: Partial<Pick<Annotation, 'text' | 'date'>>) => {
      updateAnnotation(id, patch);
      setAnnotations(getAnnotations(chartId));
    },
    [chartId],
  );

  const remove = useCallback((id: string) => {
    deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { annotations, add, edit, remove };
}
