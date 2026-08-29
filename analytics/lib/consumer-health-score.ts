/**
 * API consumer health scoring.
 *
 * A consumer is "healthy" when it stays clear of its rate limits, keeps its
 * error rate low, and grows at a rate its quota can absorb. Each of those is
 * scored 0-100 independently so an unhealthy consumer can be told *why* it is
 * unhealthy, then combined into a weighted overall score.
 */

export type HealthStatus = 'healthy' | 'watch' | 'unhealthy';
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Weights sum to 1. Errors dominate: they are what consumers actually feel. */
export const SCORE_WEIGHTS = { errorRate: 0.4, rateLimit: 0.35, usageTrend: 0.25 } as const;

export const UNHEALTHY_THRESHOLD = 60;
export const WATCH_THRESHOLD = 78;

export interface ConsumerUsage {
  key: string;
  name: string;
  owner: string;
  tier: 'free' | 'growth' | 'enterprise';
  /** Requests served over the scoring window. */
  requests30d: number;
  /** 4xx+5xx share of requests, in percent. */
  errorRatePct: number;
  /** Share of errors that were 5xx - server-side faults are weighted harder. */
  serverErrorSharePct: number;
  /** Requests rejected with 429 over the window. */
  throttled429: number;
  /** Requests that landed in the top 10% of the rate-limit window. */
  nearLimitRequests: number;
  /** Contractual ceiling, requests/day. */
  dailyQuota: number;
  /** Daily request counts for the last 8 weeks, oldest first. */
  weeklyRequests: number[];
}

export interface ScoreComponent {
  key: 'errorRate' | 'rateLimit' | 'usageTrend';
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface ConsumerHealth {
  usage: ConsumerUsage;
  score: number;
  grade: HealthGrade;
  status: HealthStatus;
  components: ScoreComponent[];
  /** Percent change between the first and last week of the window. */
  trendPct: number;
  /** Peak daily usage as a share of the daily quota. */
  quotaUtilizationPct: number;
  /** 429s as a share of all requests, in percent. */
  throttleRatePct: number;
  /** Human-readable reasons the consumer is not healthy; empty when healthy. */
  reasons: string[];
}

export interface UnhealthyAlert {
  key: string;
  name: string;
  owner: string;
  score: number;
  status: HealthStatus;
  severity: 'warning' | 'critical';
  /** The component dragging the score down the most. */
  worstComponent: ScoreComponent;
  reasons: string[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * 0% errors scores 100 and falls off linearly to 0 at 5%, with an extra penalty
 * proportional to how much of the error budget is 5xx.
 */
function errorRateScore(u: ConsumerUsage): ScoreComponent {
  const base = clamp(100 - (u.errorRatePct / 5) * 100);
  const serverPenalty = (u.serverErrorSharePct / 100) * u.errorRatePct * 4;
  const score = Math.round(clamp(base - serverPenalty));
  return {
    key: 'errorRate',
    label: 'Error rate',
    score,
    weight: SCORE_WEIGHTS.errorRate,
    detail: `${u.errorRatePct.toFixed(2)}% errors · ${u.serverErrorSharePct}% of them 5xx`,
  };
}

/**
 * Combines hard throttling (429s) with how often the consumer creeps into the
 * top of its window. A consumer that never gets close scores 100.
 */
function rateLimitScore(u: ConsumerUsage): ScoreComponent {
  const throttleRate = u.requests30d === 0 ? 0 : (u.throttled429 / u.requests30d) * 100;
  const nearRate = u.requests30d === 0 ? 0 : (u.nearLimitRequests / u.requests30d) * 100;
  // A 1% throttle rate is already bad; brushing the limit is a softer signal.
  const score = Math.round(clamp(100 - throttleRate * 45 - nearRate * 4));
  return {
    key: 'rateLimit',
    label: 'Rate limit compliance',
    score,
    weight: SCORE_WEIGHTS.rateLimit,
    detail: `${u.throttled429.toLocaleString()} × 429 (${throttleRate.toFixed(2)}%) · ${nearRate.toFixed(1)}% near-limit`,
  };
}

/**
 * Healthy growth is steady and stays inside quota. Both a collapse in traffic
 * (integration rotting, churn risk) and growth that projects past the quota
 * inside a quarter cost points.
 */
function usageTrendScore(u: ConsumerUsage): ScoreComponent {
  const weeks = u.weeklyRequests;
  const first = weeks[0] || 1;
  const last = weeks[weeks.length - 1];
  const changePct = ((last - first) / first) * 100;

  let score = 100;
  if (changePct < 0) score -= Math.min(60, Math.abs(changePct) * 1.6);

  // Project the weekly growth rate forward one quarter against the daily quota.
  const weeklyGrowth = weeks.length > 1 ? (last / first) ** (1 / (weeks.length - 1)) - 1 : 0;
  const projectedPeak = (last / 7) * (1 + weeklyGrowth) ** 13;
  const projectedUtil = (projectedPeak / u.dailyQuota) * 100;
  if (projectedUtil > 100) score -= Math.min(45, (projectedUtil - 100) * 0.5);
  else if (projectedUtil > 80) score -= (projectedUtil - 80) * 0.6;

  // Volatility: a spiky integration is harder to capacity-plan for.
  const mean = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  const cv = mean === 0 ? 0 : Math.sqrt(weeks.reduce((a, b) => a + (b - mean) ** 2, 0) / weeks.length) / mean;
  score -= Math.min(20, cv * 60);

  return {
    key: 'usageTrend',
    label: 'Usage trend',
    score: Math.round(clamp(score)),
    weight: SCORE_WEIGHTS.usageTrend,
    detail: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(0)}% over 8w · ${Math.round(projectedUtil)}% of quota in 90d`,
  };
}

function gradeFor(score: number): HealthGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function scoreConsumer(usage: ConsumerUsage): ConsumerHealth {
  const components = [errorRateScore(usage), rateLimitScore(usage), usageTrendScore(usage)];
  const score = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0));
  const status: HealthStatus =
    score < UNHEALTHY_THRESHOLD ? 'unhealthy' : score < WATCH_THRESHOLD ? 'watch' : 'healthy';

  const peakDaily = Math.max(...usage.weeklyRequests) / 7;
  const quotaUtilizationPct = Math.round((peakDaily / usage.dailyQuota) * 100);
  const throttleRatePct =
    usage.requests30d === 0
      ? 0
      : Math.round((usage.throttled429 / usage.requests30d) * 10000) / 100;
  const first = usage.weeklyRequests[0] || 1;
  const trendPct = Math.round(
    ((usage.weeklyRequests[usage.weeklyRequests.length - 1] - first) / first) * 100
  );

  const reasons: string[] = [];
  if (usage.errorRatePct >= 2)
    reasons.push(`Error rate ${usage.errorRatePct.toFixed(2)}% is above the 2% budget`);
  if (throttleRatePct >= 0.5)
    reasons.push(`${throttleRatePct}% of requests are being rejected with 429`);
  if (quotaUtilizationPct >= 85)
    reasons.push(`Peak day used ${quotaUtilizationPct}% of the ${usage.dailyQuota.toLocaleString()} req/day quota`);
  if (trendPct <= -25) reasons.push(`Traffic fell ${Math.abs(trendPct)}% over 8 weeks — churn risk`);
  if (usage.serverErrorSharePct >= 40 && usage.errorRatePct >= 1)
    reasons.push(`${usage.serverErrorSharePct}% of this consumer's errors are 5xx — likely our fault`);

  return {
    usage,
    score,
    grade: gradeFor(score),
    status,
    components,
    trendPct,
    quotaUtilizationPct,
    throttleRatePct,
    reasons,
  };
}

export function scoreAllConsumers(usages: ConsumerUsage[]): ConsumerHealth[] {
  return usages.map(scoreConsumer).sort((a, b) => a.score - b.score);
}

export function unhealthyAlerts(scored: ConsumerHealth[]): UnhealthyAlert[] {
  return scored
    .filter((c) => c.status !== 'healthy')
    .map((c) => ({
      key: c.usage.key,
      name: c.usage.name,
      owner: c.usage.owner,
      score: c.score,
      status: c.status,
      severity: c.status === 'unhealthy' ? ('critical' as const) : ('warning' as const),
      worstComponent: c.components.reduce((w, x) => (x.score < w.score ? x : w)),
      reasons: c.reasons.length
        ? c.reasons
        : [`Overall score ${c.score} is below the ${WATCH_THRESHOLD} watch threshold`],
    }))
    .sort((a, b) => a.score - b.score);
}

export function fleetAverage(scored: ConsumerHealth[]): number {
  if (!scored.length) return 0;
  return Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length);
}

export const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: '#15803d',
  watch: '#b45309',
  unhealthy: '#dc2626',
};

export const SAMPLE_CONSUMERS: ConsumerUsage[] = [
  {
    key: 'gp_live_a91f…3ac', name: 'StellarPay', owner: 'Payments Team', tier: 'enterprise',
    requests30d: 4_260_000, errorRatePct: 0.42, serverErrorSharePct: 18,
    throttled429: 1_850, nearLimitRequests: 96_400, dailyQuota: 200_000,
    weeklyRequests: [820_000, 845_000, 861_000, 902_000, 918_000, 944_000, 971_000, 995_000],
  },
  {
    key: 'gp_live_7cd2…88b', name: 'GistFeed', owner: 'Core Team', tier: 'enterprise',
    requests30d: 2_980_000, errorRatePct: 0.71, serverErrorSharePct: 24,
    throttled429: 640, nearLimitRequests: 41_200, dailyQuota: 150_000,
    weeklyRequests: [690_000, 702_000, 698_000, 715_000, 721_000, 733_000, 740_000, 752_000],
  },
  {
    key: 'gp_live_11e8…5f0', name: 'WalletBot', owner: 'Bots Team', tier: 'growth',
    requests30d: 1_540_000, errorRatePct: 3.85, serverErrorSharePct: 12,
    throttled429: 28_900, nearLimitRequests: 214_000, dailyQuota: 60_000,
    weeklyRequests: [260_000, 298_000, 341_000, 386_000, 424_000, 468_000, 512_000, 566_000],
  },
  {
    key: 'gp_live_4b60…9d1', name: 'TipJar', owner: 'Payments Team', tier: 'growth',
    requests30d: 1_120_000, errorRatePct: 0.95, serverErrorSharePct: 31,
    throttled429: 2_100, nearLimitRequests: 58_000, dailyQuota: 60_000,
    weeklyRequests: [268_000, 271_000, 265_000, 274_000, 279_000, 281_000, 284_000, 288_000],
  },
  {
    key: 'gp_live_ff35…2e7', name: 'PinBoard', owner: 'Core Team', tier: 'growth',
    requests30d: 690_000, errorRatePct: 1.62, serverErrorSharePct: 52,
    throttled429: 410, nearLimitRequests: 12_800, dailyQuota: 40_000,
    weeklyRequests: [212_000, 196_000, 181_000, 168_000, 152_000, 141_000, 128_000, 119_000],
  },
  {
    key: 'gp_live_8a17…6b4', name: 'EventPulse', owner: 'Events Team', tier: 'growth',
    requests30d: 540_000, errorRatePct: 0.38, serverErrorSharePct: 9,
    throttled429: 90, nearLimitRequests: 6_400, dailyQuota: 40_000,
    weeklyRequests: [118_000, 126_000, 131_000, 129_000, 136_000, 142_000, 148_000, 155_000],
  },
  {
    key: 'gp_live_2d99…0c5', name: 'SafetyNet', owner: 'Safety Team', tier: 'free',
    requests30d: 310_000, errorRatePct: 5.40, serverErrorSharePct: 8,
    throttled429: 41_200, nearLimitRequests: 88_000, dailyQuota: 10_000,
    weeklyRequests: [52_000, 61_000, 74_000, 59_000, 88_000, 63_000, 97_000, 71_000],
  },
  {
    key: 'gp_live_63bb…7a2', name: 'FoodCrawl', owner: 'Food Team', tier: 'free',
    requests30d: 168_000, errorRatePct: 1.05, serverErrorSharePct: 15,
    throttled429: 320, nearLimitRequests: 4_100, dailyQuota: 10_000,
    weeklyRequests: [38_000, 39_500, 40_100, 41_000, 42_200, 43_000, 44_100, 45_000],
  },
];
