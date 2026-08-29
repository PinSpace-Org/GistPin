/**
 * Soroban contract event volume forecasting.
 *
 * Fits an ordinary-least-squares trend over daily event counts, layers the
 * day-of-week profile back on top, and widens a prediction interval with the
 * forecast horizon. Capacity thresholds are checked against both the expected
 * value and the upper bound so infrastructure planning gets an early warning
 * before the mean line crosses.
 */

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type ConfidenceLevel = 80 | 90 | 95;
export type Severity = 'warning' | 'critical';

export interface EventVolumePoint {
  /** ISO date (UTC) of the bucket. */
  date: string;
  /** Short axis label, e.g. "14 Jul". */
  label: string;
  /** Events emitted by the contract on that day. */
  value: number;
}

export interface ForecastPoint extends EventVolumePoint {
  /** Days ahead of the last observed day (1-based). */
  horizon: number;
  lower: number;
  upper: number;
}

export interface TrendModel {
  slope: number;
  intercept: number;
  /** Goodness of fit of the trend line, 0-1. */
  r2: number;
  /** Residual standard error, used to size the prediction interval. */
  sigma: number;
  /** Multiplicative day-of-week factors, indexed 0 (Sun) - 6 (Sat). */
  weekdayFactors: number[];
  n: number;
  meanX: number;
  sxx: number;
}

export interface CapacityThreshold {
  name: string;
  /** Sustainable events/day for the component. */
  limit: number;
  severity: Severity;
  note?: string;
}

export interface BreachAlert {
  threshold: string;
  severity: Severity;
  limit: number;
  /** Which line crossed first - the upper bound always crosses before the mean. */
  bound: 'upper' | 'expected';
  date: string;
  label: string;
  horizonDays: number;
  projected: number;
  /** Percentage of the limit consumed on the breach day. */
  utilizationPct: number;
}

export interface VolumeForecast {
  historical: EventVolumePoint[];
  forecast: ForecastPoint[];
  model: TrendModel;
  thresholds: CapacityThreshold[];
  alerts: BreachAlert[];
  confidence: ConfidenceLevel;
  /** Mean daily volume over the last 7 observed days. */
  currentDailyAvg: number;
  /** Expected volume on the final forecast day. */
  projectedDailyAvg: number;
  /** Growth from currentDailyAvg to projectedDailyAvg, in percent. */
  growthPct: number;
  /** Highest upper-bound value across the forecast window. */
  peakUpper: number;
}

export interface EventStream {
  id: string;
  /** Soroban contract that emits the topic. */
  contract: string;
  /** Event topic name as published on-chain. */
  topic: string;
  label: string;
  /** Seed for the deterministic sample generator. */
  seed: number;
  baseline: number;
  /** Fractional daily growth, e.g. 0.012 = 1.2%/day. */
  dailyGrowth: number;
  /** Relative noise amplitude, 0-1. */
  volatility: number;
}

const Z_SCORES: Record<ConfidenceLevel, number> = { 80: 1.2816, 90: 1.6449, 95: 1.96 };

/** Deterministic PRNG so server and client renders agree. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Midnight UTC today - keeps labels stable across a render pass. */
function todayUtc(): number {
  return Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY;
}

function formatLabel(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const EVENT_STREAMS: EventStream[] = [
  { id: 'gist_created',     contract: 'CGIST…4K2P', topic: 'gist_created',     label: 'Gist Created',      seed: 1_337, baseline: 41_000, dailyGrowth: 0.0125, volatility: 0.16 },
  { id: 'gist_expired',     contract: 'CGIST…4K2P', topic: 'gist_expired',     label: 'Gist Expired',      seed: 2_411, baseline: 38_500, dailyGrowth: 0.0110, volatility: 0.13 },
  { id: 'tip_sent',         contract: 'CTIP…9QX1',  topic: 'tip_sent',         label: 'Tip Sent',          seed: 7_723, baseline: 12_800, dailyGrowth: 0.0210, volatility: 0.24 },
  { id: 'reaction_added',   contract: 'CGIST…4K2P', topic: 'reaction_added',   label: 'Reaction Added',    seed: 5_150, baseline: 96_400, dailyGrowth: 0.0085, volatility: 0.11 },
  { id: 'moderation_flag',  contract: 'CMOD…7B3D',  topic: 'moderation_flag',  label: 'Moderation Flag',   seed: 9_042, baseline: 3_150,  dailyGrowth: 0.0165, volatility: 0.31 },
  { id: 'cell_registered',  contract: 'CGEO…2M8F',  topic: 'cell_registered',  label: 'Geo Cell Registered', seed: 3_366, baseline: 7_900, dailyGrowth: 0.0190, volatility: 0.21 },
];

export const DEFAULT_CAPACITY_THRESHOLDS: CapacityThreshold[] = [
  { name: 'Indexer sustained throughput', limit: 72_000,  severity: 'warning',  note: 'Ingest workers start lagging beyond this rate.' },
  { name: 'Indexer hard ceiling',         limit: 95_000,  severity: 'critical', note: 'Queue backpressure; requires a worker scale-out.' },
  { name: 'Event store write budget',     limit: 120_000, severity: 'critical', note: 'Provisioned write IOPS for the events table.' },
];

/** OLS fit of value against day index, plus the multiplicative weekday profile. */
export function fitTrend(historical: EventVolumePoint[]): TrendModel {
  const values = historical.map((p) => p.value);
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  const sxx = values.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0);
  const sxy = values.reduce((acc, y, i) => acc + (i - meanX) * (y - meanY), 0);
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;

  const fitted = values.map((_, i) => slope * i + intercept);
  const ssTot = values.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const ssRes = values.reduce((acc, y, i) => acc + (y - fitted[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const sigma = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Average ratio of observed to fitted, bucketed by weekday.
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  historical.forEach((p, i) => {
    if (fitted[i] <= 0) return;
    const dow = new Date(`${p.date}T00:00:00Z`).getUTCDay();
    sums[dow] += p.value / fitted[i];
    counts[dow] += 1;
  });
  const raw = sums.map((s, i) => (counts[i] ? s / counts[i] : 1));
  const rawMean = raw.reduce((a, b) => a + b, 0) / 7;
  const weekdayFactors = raw.map((f) => (rawMean === 0 ? 1 : f / rawMean));

  return { slope, intercept, r2, sigma, weekdayFactors, n, meanX, sxx };
}

/** Deterministic sample history for a stream, ending on today (UTC). */
export function generateEventVolumeHistory(stream: EventStream, days = 90): EventVolumePoint[] {
  const rand = mulberry32(stream.seed);
  const end = todayUtc();
  // Weekend contract traffic dips; Wednesday is the weekly peak.
  const dowShape = [0.82, 1.0, 1.04, 1.08, 1.05, 0.98, 0.84];

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end - (days - 1 - i) * MS_PER_DAY);
    const trend = stream.baseline * (1 + stream.dailyGrowth) ** i;
    const seasonal = dowShape[d.getUTCDay()];
    const noise = 1 + (rand() - 0.5) * 2 * stream.volatility;
    // Occasional campaign spike, ~1 day in 25.
    const spike = rand() > 0.96 ? 1 + rand() * 0.5 : 1;
    return {
      date: isoDate(d),
      label: formatLabel(d),
      value: Math.max(0, Math.round(trend * seasonal * noise * spike)),
    };
  });
}

/** First day each threshold is crossed, by upper bound and by expected value. */
export function detectBreaches(
  forecast: ForecastPoint[],
  thresholds: CapacityThreshold[]
): BreachAlert[] {
  const alerts: BreachAlert[] = [];

  for (const threshold of thresholds) {
    const firstUpper = forecast.find((p) => p.upper >= threshold.limit);
    const firstExpected = forecast.find((p) => p.value >= threshold.limit);
    const hit = firstExpected ?? firstUpper;
    if (!hit) continue;

    const bound: BreachAlert['bound'] = firstExpected ? 'expected' : 'upper';
    const projected = bound === 'expected' ? hit.value : hit.upper;
    alerts.push({
      threshold: threshold.name,
      severity: threshold.severity,
      limit: threshold.limit,
      bound,
      date: hit.date,
      label: hit.label,
      horizonDays: hit.horizon,
      projected,
      utilizationPct: Math.round((projected / threshold.limit) * 1000) / 10,
    });
  }

  return alerts.sort((a, b) => a.horizonDays - b.horizonDays);
}

export function forecastEventVolume(
  historical: EventVolumePoint[],
  options: {
    days?: number;
    confidence?: ConfidenceLevel;
    thresholds?: CapacityThreshold[];
  } = {}
): VolumeForecast {
  const { days = 30, confidence = 95, thresholds = DEFAULT_CAPACITY_THRESHOLDS } = options;
  const model = fitTrend(historical);
  const z = Z_SCORES[confidence];
  const lastDate = new Date(`${historical[historical.length - 1].date}T00:00:00Z`).getTime();

  const forecast: ForecastPoint[] = Array.from({ length: days }, (_, i) => {
    const horizon = i + 1;
    const x = model.n - 1 + horizon;
    const d = new Date(lastDate + horizon * MS_PER_DAY);
    const factor = model.weekdayFactors[d.getUTCDay()];
    const expected = (model.slope * x + model.intercept) * factor;

    // Prediction interval for a new observation, widening with distance from the mean x.
    const se =
      model.sigma *
      Math.sqrt(1 + 1 / model.n + (model.sxx === 0 ? 0 : (x - model.meanX) ** 2 / model.sxx));
    const margin = z * se * factor;

    return {
      date: isoDate(d),
      label: formatLabel(d),
      horizon,
      value: Math.max(0, Math.round(expected)),
      lower: Math.max(0, Math.round(expected - margin)),
      upper: Math.max(0, Math.round(expected + margin)),
    };
  });

  const recent = historical.slice(-7);
  const currentDailyAvg = Math.round(recent.reduce((s, p) => s + p.value, 0) / recent.length);
  const projectedDailyAvg = forecast[forecast.length - 1].value;
  const growthPct =
    currentDailyAvg === 0
      ? 0
      : Math.round(((projectedDailyAvg - currentDailyAvg) / currentDailyAvg) * 1000) / 10;

  return {
    historical,
    forecast,
    model,
    thresholds,
    alerts: detectBreaches(forecast, thresholds),
    confidence,
    currentDailyAvg,
    projectedDailyAvg,
    growthPct,
    peakUpper: forecast.reduce((m, p) => Math.max(m, p.upper), 0),
  };
}

/** Days of headroom before the expected line reaches `limit`, or null if it never does. */
export function daysOfHeadroom(forecast: ForecastPoint[], limit: number): number | null {
  const hit = forecast.find((p) => p.value >= limit);
  return hit ? hit.horizon : null;
}

export function formatEvents(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
