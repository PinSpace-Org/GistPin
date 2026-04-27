'use client';

import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import ChartErrorBoundary from '@/components/ui/ChartErrorBoundary';
import ChartSkeleton from '@/components/ui/ChartSkeleton';
import { useDebounce } from '@/hooks/useDebounce';

interface ChartWrapperProps {
  title?: string;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

function ChartWrapper({ title, loading, children, className = '' }: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const debouncedWidth = useDebounce(width, 150);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number;
    const observer = new ResizeObserver(() => {
      rafId = requestAnimationFrame(() => setWidth(el.offsetWidth));
    });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <div
      ref={containerRef}
      data-width={debouncedWidth}
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      {title && <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>}
      <ChartErrorBoundary title={title ?? 'Chart error'}>
        {loading ? <ChartSkeleton /> : children}
      </ChartErrorBoundary>
    </div>
  );
}

export default memo(ChartWrapper);
