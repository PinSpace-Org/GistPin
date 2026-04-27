'use client';

import { useMemo, useState } from 'react';
import { analyseDataQuality, qualityColor, qualityIcon, type QualityReport } from '@/lib/data-quality';

interface DataQualityBadgeProps {
  labels: string[];
  values: number[];
  /** Optional label shown in the tooltip header */
  metricName?: string;
}

/** Small traffic-light badge that shows data quality for a chart. */
export function DataQualityBadge({ labels, values, metricName }: DataQualityBadgeProps) {
  const [open, setOpen] = useState(false);
  const report = useMemo(() => analyseDataQuality(labels, values), [labels, values]);
  const color = qualityColor(report.level);
  const icon = qualityIcon(report.level);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Data quality: ${report.score}%`}
        aria-label={`Data quality ${report.score}%`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 999,
          border: `1px solid ${color}44`,
          background: `${color}18`,
          color,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span>{icon}</span>
        <span>{report.score}%</span>
      </button>

      {open && (
        <QualityTooltip report={report} metricName={metricName} onClose={() => setOpen(false)} />
      )}
    </span>
  );
}

function QualityTooltip({
  report,
  metricName,
  onClose,
}: {
  report: QualityReport;
  metricName?: string;
  onClose: () => void;
}) {
  const color = qualityColor(report.level);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="tooltip"
        style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          zIndex: 100,
          minWidth: 260,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
          padding: '14px 16px',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
          {metricName ? `${metricName} — ` : ''}Data Quality
        </div>

        {/* Score bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{ width: `${report.score}%`, height: '100%', background: color, borderRadius: 999 }}
            />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{report.score}%</span>
        </div>

        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 8px' }}>{report.summary}</p>

        {report.gaps.length > 0 && (
          <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 4 }}>
            <strong>Gaps (&gt;24 h):</strong>{' '}
            {report.gaps
              .slice(0, 3)
              .map((g) => g.label)
              .join(', ')}
            {report.gaps.length > 3 ? ` +${report.gaps.length - 3} more` : ''}
          </div>
        )}

        {report.flatRuns.length > 0 && (
          <div style={{ fontSize: 11, color: '#f59e0b' }}>
            <strong>Suspicious flat data</strong> at {report.flatRuns.length} point
            {report.flatRuns.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  );
}

// ── Chart wrapper that adds a quality badge ───────────────────────────────────

interface WithDataQualityProps {
  labels: string[];
  values: number[];
  metricName?: string;
  children: React.ReactNode;
}

/**
 * Wraps a chart card header with a data quality badge.
 * Usage:
 *   <WithDataQuality labels={...} values={...} metricName="Daily Gists">
 *     <DailyGistsChart />
 *   </WithDataQuality>
 */
export function WithDataQuality({ labels, values, metricName, children }: WithDataQualityProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {metricName && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {metricName}
          </span>
        )}
        <DataQualityBadge labels={labels} values={values} metricName={metricName} />
      </div>
      {children}
    </div>
  );
}
