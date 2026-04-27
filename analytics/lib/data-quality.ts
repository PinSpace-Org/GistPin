/**
 * Data quality analysis utilities (issue #157).
 * Checks for gaps, suspicious patterns, and produces a 0-100 quality score.
 */

export type QualityLevel = 'good' | 'warning' | 'poor';

export interface DataGap {
  /** Index of the missing/zero entry */
  index: number;
  label: string;
  /** Gap duration in hours (approximated from series length) */
  gapHours: number;
}

export interface QualityReport {
  /** 0–100 quality score */
  score: number;
  level: QualityLevel;
  gaps: DataGap[];
  /** Indices where values look suspiciously flat (identical runs) */
  flatRuns: number[];
  /** Human-readable explanation */
  summary: string;
}

const GAP_THRESHOLD_HOURS = 24;

/**
 * Analyse a labelled numeric series for data quality issues.
 *
 * @param labels  Display labels (one per data point, e.g. "1 Jan")
 * @param values  Numeric values aligned with labels
 * @param totalHours  Total time window in hours (default: labels.length * 24)
 */
export function analyseDataQuality(
  labels: string[],
  values: number[],
  totalHours = labels.length * 24,
): QualityReport {
  const n = values.length;
  if (n === 0) {
    return { score: 0, level: 'poor', gaps: [], flatRuns: [], summary: 'No data available.' };
  }

  const hoursPerPoint = totalHours / n;

  // ── Detect gaps (zero or missing values that span >24 h) ─────────────────
  const gaps: DataGap[] = [];
  for (let i = 0; i < n; i++) {
    if (values[i] === 0 || values[i] == null) {
      const gapHours = hoursPerPoint;
      if (gapHours >= GAP_THRESHOLD_HOURS) {
        gaps.push({ index: i, label: labels[i] ?? `Point ${i}`, gapHours: Math.round(gapHours) });
      }
    }
  }

  // ── Detect flat runs (≥3 consecutive identical non-zero values) ───────────
  const flatRuns: number[] = [];
  let runStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || values[i] !== values[runStart]) {
      const runLen = i - runStart;
      if (runLen >= 3 && values[runStart] !== 0) {
        for (let j = runStart; j < i; j++) flatRuns.push(j);
      }
      runStart = i;
    }
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const gapPenalty = Math.min(gaps.length * 10, 50);
  const flatPenalty = Math.min(Math.floor(flatRuns.length / 3) * 5, 30);
  const score = Math.max(0, 100 - gapPenalty - flatPenalty);

  const level: QualityLevel = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'poor';

  const parts: string[] = [];
  if (gaps.length > 0) parts.push(`${gaps.length} gap${gaps.length > 1 ? 's' : ''} >24 h`);
  if (flatRuns.length > 0) parts.push(`${flatRuns.length} suspicious flat point${flatRuns.length > 1 ? 's' : ''}`);
  const summary =
    parts.length === 0
      ? 'Data looks complete and healthy.'
      : `Issues detected: ${parts.join(', ')}.`;

  return { score, level, gaps, flatRuns, summary };
}

/** Colour token for a quality level (Tailwind-compatible hex values). */
export function qualityColor(level: QualityLevel): string {
  return level === 'good' ? '#22c55e' : level === 'warning' ? '#f59e0b' : '#ef4444';
}

/** Emoji traffic-light indicator. */
export function qualityIcon(level: QualityLevel): string {
  return level === 'good' ? '🟢' : level === 'warning' ? '🟡' : '🔴';
}
