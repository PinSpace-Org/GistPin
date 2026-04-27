const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
  }
`;

function ShimmerBlock({ height, width, radius = 8 }: { height: number; width?: number | string; radius?: number }) {
  return <div className="skeleton-shimmer" style={{ height, width: width ?? '100%', borderRadius: radius }} />;
}

/** Skeleton for chart panels */
export default function ChartSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ShimmerBlock height={18} width={180} radius={999} />
        <ShimmerBlock height={220} radius={18} />
      </div>
    </>
  );
}

/** Skeleton for KPI cards */
export function KPICardSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ borderRadius: 16, padding: '24px 28px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ShimmerBlock height={12} width={80} radius={999} />
          <ShimmerBlock height={36} width={36} radius={10} />
        </div>
        <ShimmerBlock height={40} width={120} radius={8} />
        <ShimmerBlock height={14} width={100} radius={999} />
      </div>
    </>
  );
}

/** Skeleton for table rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ShimmerBlock height={16} width={140} radius={999} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <ShimmerBlock height={14} width="60%" radius={999} />
            <ShimmerBlock height={14} width="30%" radius={999} />
          </div>
        ))}
      </div>
    </>
  );
}
