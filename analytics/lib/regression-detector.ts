export interface QuerySample {
  timestamp: number;
  queryType: string;
  radiusKm: number;
  durationMs: number;
  rowCount: number;
  deployedVersion: string;
}

export interface BaselineStats {
  queryType: string;
  radiusKm: number;
  meanMs: number;
  stdMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface RegressionAlert {
  queryType: string;
  radiusKm: number;
  baselineMeanMs: number;
  currentMeanMs: number;
  slowdownPct: number;
  severity: 'warning' | 'critical';
  detectedAt: number;
  message: string;
}

export interface DeploymentComparison {
  version: string;
  deployments: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  regressionCount: number;
}

export interface RadiusPerformance {
  radiusKm: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  samples: number;
  trend: number[];
}

const SLOWDOWN_THRESHOLD = 20;

export function computeBaseline(samples: QuerySample[]): BaselineStats[] {
  const grouped = new Map<string, QuerySample[]>();
  for (const s of samples) {
    const key = `${s.queryType}:${s.radiusKm}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  return Array.from(grouped.entries()).map(([key, group]) => {
    const sorted = group.map((s) => s.durationMs).sort((a, b) => a - b);
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const variance = sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / sorted.length;
    const std = Math.sqrt(variance);
    const [queryType, radiusKm] = key.split(':');

    return {
      queryType,
      radiusKm: parseFloat(radiusKm),
      meanMs: +mean.toFixed(1),
      stdMs: +std.toFixed(1),
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      p99Ms: percentile(sorted, 99),
      sampleCount: sorted.length,
      lastUpdated: Math.max(...group.map((s) => s.timestamp)),
    };
  });
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return +sorted[Math.max(0, idx)].toFixed(1);
}

export function detectRegressions(
  samples: QuerySample[],
  baselines: BaselineStats[],
  threshold = SLOWDOWN_THRESHOLD
): RegressionAlert[] {
  const alerts: RegressionAlert[] = [];
  const recentWindow = 60 * 60 * 1000;
  const now = Date.now();

  const recent = samples.filter((s) => now - s.timestamp < recentWindow);
  const grouped = new Map<string, QuerySample[]>();
  for (const s of recent) {
    const key = `${s.queryType}:${s.radiusKm}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  for (const baseline of baselines) {
    const key = `${baseline.queryType}:${baseline.radiusKm}`;
    const group = grouped.get(key);
    if (!group || group.length < 5) continue;

    const currentMean = group.reduce((s, v) => s + v.durationMs, 0) / group.length;
    const slowdownPct = ((currentMean - baseline.meanMs) / baseline.meanMs) * 100;

    if (slowdownPct >= threshold) {
      alerts.push({
        queryType: baseline.queryType,
        radiusKm: baseline.radiusKm,
        baselineMeanMs: baseline.meanMs,
        currentMeanMs: +currentMean.toFixed(1),
        slowdownPct: +slowdownPct.toFixed(1),
        severity: slowdownPct >= 50 ? 'critical' : 'warning',
        detectedAt: now,
        message: `${baseline.queryType} at ${baseline.radiusKm}km radius is ${slowdownPct.toFixed(1)}% slower than baseline (${baseline.meanMs}ms → ${currentMean.toFixed(1)}ms)`,
      });
    }
  }

  return alerts.sort((a, b) => b.slowdownPct - a.slowdownPct);
}

export function compareDeployments(
  samples: QuerySample[]
): DeploymentComparison[] {
  const grouped = new Map<string, QuerySample[]>();
  for (const s of samples) {
    if (!grouped.has(s.deployedVersion)) grouped.set(s.deployedVersion, []);
    grouped.get(s.deployedVersion)!.push(s);
  }

  return Array.from(grouped.entries())
    .map(([version, group]) => {
      const sorted = group.map((s) => s.durationMs).sort((a, b) => a - b);
      const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const uniqueTypes = new Set(group.map((s) => `${s.queryType}:${s.radiusKm}`));
      let regressionCount = 0;

      for (const type of uniqueTypes) {
        const typeSamples = group.filter((s) => `${s.queryType}:${s.radiusKm}` === type);
        const prevSamples = group.filter((s) => `${s.queryType}:${s.radiusKm}` === type && s.deployedVersion !== version);
        if (prevSamples.length === 0) continue;
        const prevMean = prevSamples.reduce((s, v) => s + v.durationMs, 0) / prevSamples.length;
        const currMean = typeSamples.reduce((s, v) => s + v.durationMs, 0) / typeSamples.length;
        if ((currMean - prevMean) / prevMean * 100 >= SLOWDOWN_THRESHOLD) regressionCount++;
      }

      return {
        version,
        deployments: group.length,
        avgMs: +mean.toFixed(1),
        p50Ms: percentile(sorted, 50),
        p95Ms: percentile(sorted, 95),
        regressionCount,
      };
    })
    .sort((a, b) => b.deployments - a.deployments);
}

export function computeRadiusPerformance(samples: QuerySample[]): RadiusPerformance[] {
  const grouped = new Map<number, QuerySample[]>();
  for (const s of samples) {
    if (!grouped.has(s.radiusKm)) grouped.set(s.radiusKm, []);
    grouped.get(s.radiusKm)!.push(s);
  }

  return Array.from(grouped.entries())
    .map(([radius, group]) => {
      const sorted = group.map((s) => s.durationMs).sort((a, b) => a - b);
      const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const hourly = new Map<number, number[]>();
      for (const s of group) {
        const hour = new Date(s.timestamp).getHours();
        if (!hourly.has(hour)) hourly.set(hour, []);
        hourly.get(hour)!.push(s.durationMs);
      }
      const trend = Array.from({ length: 24 }, (_, h) => {
        const vals = hourly.get(h);
        if (!vals || vals.length === 0) return 0;
        return +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
      });

      return {
        radiusKm: radius,
        avgMs: +mean.toFixed(1),
        p50Ms: percentile(sorted, 50),
        p95Ms: percentile(sorted, 95),
        p99Ms: percentile(sorted, 99),
        samples: sorted.length,
        trend,
      };
    })
    .sort((a, b) => a.radiusKm - b.radiusKm);
}

export function generateMockSamples(): QuerySample[] {
  const types = ['nearest_gists', 'region_scan', 'density_cluster', 'wallet_distance', 'geo_tip'];
  const radii = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50];
  const versions = ['v2.4.0', 'v2.4.1', 'v2.5.0'];
  const samples: QuerySample[] = [];
  const baseTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 1200; i++) {
    const queryType = types[Math.floor(Math.random() * types.length)];
    const radiusKm = radii[Math.floor(Math.random() * radii.length)];
    const versionIdx = Math.floor(Math.random() * versions.length);
    const version = versions[versionIdx];
    const baseMs = 20 + radiusKm * 2.5 + (queryType === 'density_cluster' ? 40 : 0);
    const versionPenalty = versionIdx === 2 ? 1.35 : 1;
    const jitter = 0.8 + Math.random() * 0.4;
    const durationMs = +(baseMs * jitter * versionPenalty).toFixed(1);

    samples.push({
      timestamp: baseTime + Math.random() * 7 * 24 * 60 * 60 * 1000,
      queryType,
      radiusKm,
      durationMs,
      rowCount: Math.round(10 + radiusKm * 50 + Math.random() * 100),
      deployedVersion: version,
    });
  }

  return samples;
}
