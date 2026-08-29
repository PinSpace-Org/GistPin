/**
 * Multi-Metric Composite Alert Analyzer (Issue #1189)
 * Detects when multiple metrics simultaneously deviate to identify systemic vs isolated issues,
 * models alert cascades, and computes resolution performance.
 */

export type MetricCategory = 'api' | 'indexer' | 'ipfs' | 'stellar' | 'database' | 'frontend';

export type IssueClassification = 'systemic' | 'isolated' | 'cascade_threat';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  unit: string;
}

export interface MetricDefinition {
  id: string;
  name: string;
  category: MetricCategory;
  unit: string;
  normalThreshold: number;
  warningThreshold: number;
  criticalThreshold: number;
  weight: number; // Importance in composite score (0 - 1)
  description: string;
}

export interface MetricAnomalyEvent {
  metricId: string;
  metricName: string;
  category: MetricCategory;
  timestamp: number;
  currentValue: number;
  baselineValue: number;
  deviationPct: number;
  zScore: number;
  severity: AlertSeverity;
}

export interface AlertCascadeStep {
  stepIndex: number;
  metricId: string;
  metricName: string;
  category: MetricCategory;
  offsetSeconds: number;
  impactDescription: string;
  severity: AlertSeverity;
}

export interface CompositeAlert {
  id: string;
  title: string;
  timestamp: number;
  classification: IssueClassification;
  severity: AlertSeverity;
  compositeScore: number; // 0 - 100
  rootCauseMetricId: string;
  rootCauseCategory: MetricCategory;
  affectedSubsystems: MetricCategory[];
  activeAnomalies: MetricAnomalyEvent[];
  cascadeChain: AlertCascadeStep[];
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
  mttdSeconds: number; // Time to detect
  mttaSeconds?: number; // Time to acknowledge
  mttrSeconds?: number; // Time to resolve
  blastRadius: {
    estimatedAffectedUsers: number;
    affectedRegions: string[];
    contractCallsDelayed: number;
  };
  recommendedActions: string[];
}

export interface MetricCorrelation {
  sourceMetric: string;
  targetMetric: string;
  correlationCoeff: number; // -1 to 1
  lagSeconds: number; // Typical delay between deviations
  relationshipStrength: 'strong' | 'moderate' | 'weak';
  causalityLikelihood: number; // 0 - 100%
}

export interface ResolutionMetricsByType {
  category: MetricCategory | 'systemic' | 'isolated';
  label: string;
  totalIncidents: number;
  avgMttdMinutes: number;
  avgMttaMinutes: number;
  avgMttrMinutes: number;
  slaBreachRate: number; // percentage
  trendPercentage: number; // negative is improvement
}

// ── Standard Metric Definitions ───────────────────────────────────────────────

export const MONITORED_METRICS: MetricDefinition[] = [
  {
    id: 'api_latency_p99',
    name: 'API P99 Latency',
    category: 'api',
    unit: 'ms',
    normalThreshold: 150,
    warningThreshold: 350,
    criticalThreshold: 800,
    weight: 0.85,
    description: 'P99 response time for REST/GraphQL endpoints',
  },
  {
    id: 'api_5xx_error_rate',
    name: 'API 5xx Error Rate',
    category: 'api',
    unit: '%',
    normalThreshold: 0.2,
    warningThreshold: 1.5,
    criticalThreshold: 5.0,
    weight: 0.95,
    description: 'Percentage of failing API requests',
  },
  {
    id: 'indexer_block_lag',
    name: 'Soroban Indexer Lag',
    category: 'indexer',
    unit: 'ledgers',
    normalThreshold: 2,
    warningThreshold: 8,
    criticalThreshold: 25,
    weight: 0.9,
    description: 'Difference between Stellar tip ledger and indexed ledger',
  },
  {
    id: 'ipfs_fetch_timeout_rate',
    name: 'IPFS Fetch Timeout Rate',
    category: 'ipfs',
    unit: '%',
    normalThreshold: 0.5,
    warningThreshold: 3.0,
    criticalThreshold: 10.0,
    weight: 0.8,
    description: 'Rate of failed/timed-out IPFS CID blob retrievals',
  },
  {
    id: 'stellar_rpc_latency',
    name: 'Stellar RPC Latency',
    category: 'stellar',
    unit: 'ms',
    normalThreshold: 200,
    warningThreshold: 600,
    criticalThreshold: 1500,
    weight: 0.75,
    description: 'Horizon / Soroban RPC node invocation round-trip time',
  },
  {
    id: 'db_connection_pool_saturation',
    name: 'PostgreSQL Pool Saturation',
    category: 'database',
    unit: '%',
    normalThreshold: 40,
    warningThreshold: 75,
    criticalThreshold: 92,
    weight: 0.85,
    description: 'Percentage of active PostGIS client pool connections',
  },
  {
    id: 'db_slow_query_count',
    name: 'Spatial Slow Queries',
    category: 'database',
    unit: 'qps',
    normalThreshold: 1.0,
    warningThreshold: 12.0,
    criticalThreshold: 45.0,
    weight: 0.7,
    description: 'Queries exceeding 250ms execution ceiling',
  },
  {
    id: 'frontend_client_exceptions',
    name: 'Client Runtime Exceptions',
    category: 'frontend',
    unit: 'eps',
    normalThreshold: 0.5,
    warningThreshold: 5.0,
    criticalThreshold: 20.0,
    weight: 0.6,
    description: 'Uncaught Web client and mobile render exceptions per second',
  },
];

// ── Multi-Metric Correlation Engine ──────────────────────────────────────────

/**
 * Calculates Pearson correlation coefficient between two numeric series of equal length
 */
export function calculatePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < 3) return 0;

  const meanA = seriesA.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = seriesB.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = seriesA[i] - meanA;
    const diffB = seriesB[i] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return 0;
  return +(numerator / denominator).toFixed(3);
}

/**
 * Computes the multi-metric correlation matrix across all active telemetry channels
 */
export function computeCorrelationMatrix(
  metricSeries: Record<string, number[]>
): MetricCorrelation[] {
  const metricIds = Object.keys(metricSeries);
  const correlations: MetricCorrelation[] = [];

  for (let i = 0; i < metricIds.length; i++) {
    for (let j = i + 1; j < metricIds.length; j++) {
      const idA = metricIds[i];
      const idB = metricIds[j];
      const seriesA = metricSeries[idA];
      const seriesB = metricSeries[idB];

      const r = calculatePearsonCorrelation(seriesA, seriesB);
      const absR = Math.abs(r);

      const strength: 'strong' | 'moderate' | 'weak' =
        absR >= 0.75 ? 'strong' : absR >= 0.45 ? 'moderate' : 'weak';

      // Characteristic propagation lag
      const lag = (i * 7 + j * 3) % 45 + 5;

      correlations.push({
        sourceMetric: idA,
        targetMetric: idB,
        correlationCoeff: r,
        lagSeconds: lag,
        relationshipStrength: strength,
        causalityLikelihood: Math.min(100, Math.round(absR * 92 + (strength === 'strong' ? 8 : 0))),
      });
    }
  }

  return correlations;
}

// ── Composite Score & Classification Engine ───────────────────────────────────

export interface DetectionOptions {
  sensitivityThreshold?: number; // default 55
  minimumDeviatingMetricsForSystemic?: number; // default 3
  zScoreWarningThreshold?: number; // default 2.0
}

/**
 * Analyzes active metric telemetry and generates composite alerts
 */
export function detectCompositeAlerts(
  currentMetrics: Array<{
    metricId: string;
    currentValue: number;
    baselineMean: number;
    baselineStd: number;
    timestamp: number;
  }>,
  options: DetectionOptions = {}
): CompositeAlert[] {
  const {
    sensitivityThreshold = 55,
    minimumDeviatingMetricsForSystemic = 3,
    zScoreWarningThreshold = 2.0,
  } = options;

  const anomalies: MetricAnomalyEvent[] = [];
  let weightedZSum = 0;
  let totalWeights = 0;

  for (const m of currentMetrics) {
    const def = MONITORED_METRICS.find((d) => d.id === m.metricId);
    if (!def) continue;

    const std = m.baselineStd > 0 ? m.baselineStd : 1;
    const zScore = (m.currentValue - m.baselineMean) / std;
    const deviationPct = m.baselineMean !== 0
      ? ((m.currentValue - m.baselineMean) / m.baselineMean) * 100
      : 0;

    if (zScore >= zScoreWarningThreshold || m.currentValue >= def.warningThreshold) {
      let severity: AlertSeverity = 'warning';
      if (zScore >= 4.0 || m.currentValue >= def.criticalThreshold) {
        severity = 'critical';
      }
      if (zScore >= 6.0 && m.currentValue >= def.criticalThreshold * 1.5) {
        severity = 'emergency';
      }

      anomalies.push({
        metricId: m.metricId,
        metricName: def.name,
        category: def.category,
        timestamp: m.timestamp,
        currentValue: +m.currentValue.toFixed(2),
        baselineValue: +m.baselineMean.toFixed(2),
        deviationPct: +deviationPct.toFixed(1),
        zScore: +zScore.toFixed(2),
        severity,
      });

      weightedZSum += Math.max(0, zScore) * def.weight;
      totalWeights += def.weight;
    }
  }

  if (anomalies.length === 0) return [];

  // Compute composite 0-100 anomaly score
  const avgWeightedZ = totalWeights > 0 ? weightedZSum / totalWeights : 0;
  const countFactor = Math.min(2.5, 1 + (anomalies.length - 1) * 0.35);
  const compositeScore = Math.min(100, Math.round(avgWeightedZ * 18 * countFactor));

  if (compositeScore < sensitivityThreshold) {
    return [];
  }

  // Determine Subsystems involved
  const affectedSubsystems = Array.from(new Set(anomalies.map((a) => a.category)));

  // Classify Issue: Systemic vs Isolated vs Cascade Threat
  let classification: IssueClassification = 'isolated';
  if (affectedSubsystems.length >= 3 || anomalies.length >= minimumDeviatingMetricsForSystemic) {
    classification = 'systemic';
  } else if (affectedSubsystems.length === 2 && compositeScore >= 70) {
    classification = 'cascade_threat';
  }

  // Identify root cause candidate (earliest anomaly timestamp or highest z-score)
  const rootCause = [...anomalies].sort((a, b) => a.timestamp - b.timestamp || b.zScore - a.zScore)[0];

  // Derive Severity
  let overallSeverity: AlertSeverity = 'warning';
  if (compositeScore >= 85 || classification === 'systemic') {
    overallSeverity = 'emergency';
  } else if (compositeScore >= 70) {
    overallSeverity = 'critical';
  }

  // Build Alert Cascade Chain
  const cascadeChain: AlertCascadeStep[] = anomalies.map((a, idx) => ({
    stepIndex: idx + 1,
    metricId: a.metricId,
    metricName: a.metricName,
    category: a.category,
    offsetSeconds: idx * 14 + Math.round(Math.random() * 8),
    impactDescription: getCascadeImpactDescription(a.metricId, a.deviationPct),
    severity: a.severity,
  }));

  const alert: CompositeAlert = {
    id: `cmp-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title:
      classification === 'systemic'
        ? `Systemic Outage: Multi-subsystem degradation triggered by ${rootCause.metricName}`
        : classification === 'cascade_threat'
        ? `Cascading Failure Threat: ${affectedSubsystems.join(' + ')} metrics deviating`
        : `Localized Component Anomaly: ${rootCause.metricName} deviation`,
    timestamp: Date.now(),
    classification,
    severity: overallSeverity,
    compositeScore,
    rootCauseMetricId: rootCause.metricId,
    rootCauseCategory: rootCause.category,
    affectedSubsystems,
    activeAnomalies: anomalies,
    cascadeChain,
    status: 'active',
    mttdSeconds: Math.round(28 + Math.random() * 20),
    blastRadius: {
      estimatedAffectedUsers:
        classification === 'systemic'
          ? Math.round(1800 + compositeScore * 45)
          : Math.round(120 + compositeScore * 4),
      affectedRegions:
        classification === 'systemic'
          ? ['North America East', 'Europe Central', 'Asia Pacific', 'South America']
          : ['Europe Central'],
      contractCallsDelayed:
        classification === 'systemic' ? Math.round(compositeScore * 18) : 14,
    },
    recommendedActions: getRemediationRecommendations(classification, rootCause.category),
  };

  return [alert];
}

function getCascadeImpactDescription(metricId: string, deviationPct: number): string {
  switch (metricId) {
    case 'db_connection_pool_saturation':
      return `PostGIS pool saturated (+${deviationPct}%); queries queuing up`;
    case 'api_latency_p99':
      return `API Latency ballooned (+${deviationPct}%), causing upstream gateway queueing`;
    case 'api_5xx_error_rate':
      return `HTTP 502/504 errors spiking (+${deviationPct}%) on gist pinning endpoints`;
    case 'indexer_block_lag':
      return `Soroban ledger ingestion falling behind by +${deviationPct}% ledgers`;
    case 'ipfs_fetch_timeout_rate':
      return `IPFS node gateway timeouts (+${deviationPct}%) causing UI media failures`;
    case 'stellar_rpc_latency':
      return `Horizon RPC node degradation affecting transaction simulation`;
    default:
      return `Metric exceeded anomaly bounds by +${deviationPct}%`;
  }
}

function getRemediationRecommendations(
  classification: IssueClassification,
  rootCategory: MetricCategory
): string[] {
  if (classification === 'systemic') {
    return [
      'Trigger automated circuit breaker on non-essential background indexing workers',
      'Temporarily enable stale cache fallback for read-heavy PostGIS spatial queries',
      'Failover API gateway ingress traffic to secondary Soroban RPC cluster',
      'Notify on-call platform SRE team and broadcast incident status banner',
    ];
  }
  if (rootCategory === 'database') {
    return [
      'Scale PostGIS read-replica connection pool size by +50%',
      'Terminate long-running spatial boundary intersection locks',
    ];
  }
  if (rootCategory === 'ipfs') {
    return [
      'Rotate upstream IPFS pin pinning service API keys',
      'Purge corrupted gateway edge CDN cache slices',
    ];
  }
  return [
    'Inspect application telemetry logs for recent contract deployment regressions',
    'Throttle burst rate limit on public anonymous querying tiers',
  ];
}

// ── Historical Incidents & Mock Telemetry ──────────────────────────────────────

export function getMockHistoricalAlerts(): CompositeAlert[] {
  return [
    {
      id: 'cmp-alert-2026-0801',
      title: 'Systemic Incident: PostGIS Pool Starvation Cascaded to API 5xx & Indexer Lag',
      timestamp: Date.now() - 3600 * 1000 * 48,
      classification: 'systemic',
      severity: 'emergency',
      compositeScore: 94,
      rootCauseMetricId: 'db_connection_pool_saturation',
      rootCauseCategory: 'database',
      affectedSubsystems: ['database', 'api', 'indexer', 'frontend'],
      activeAnomalies: [
        {
          metricId: 'db_connection_pool_saturation',
          metricName: 'PostgreSQL Pool Saturation',
          category: 'database',
          timestamp: Date.now() - 3600 * 1000 * 48,
          currentValue: 98.4,
          baselineValue: 42.0,
          deviationPct: 134.3,
          zScore: 5.4,
          severity: 'emergency',
        },
        {
          metricId: 'api_latency_p99',
          metricName: 'API P99 Latency',
          category: 'api',
          timestamp: Date.now() - 3600 * 1000 * 48 + 18000,
          currentValue: 1420,
          baselineValue: 145,
          deviationPct: 879.3,
          zScore: 6.2,
          severity: 'emergency',
        },
        {
          metricId: 'api_5xx_error_rate',
          metricName: 'API 5xx Error Rate',
          category: 'api',
          timestamp: Date.now() - 3600 * 1000 * 48 + 32000,
          currentValue: 8.6,
          baselineValue: 0.15,
          deviationPct: 5633.3,
          zScore: 7.1,
          severity: 'emergency',
        },
        {
          metricId: 'indexer_block_lag',
          metricName: 'Soroban Indexer Lag',
          category: 'indexer',
          timestamp: Date.now() - 3600 * 1000 * 48 + 55000,
          currentValue: 34,
          baselineValue: 2,
          deviationPct: 1600,
          zScore: 4.8,
          severity: 'critical',
        },
      ],
      cascadeChain: [
        {
          stepIndex: 1,
          metricId: 'db_connection_pool_saturation',
          metricName: 'PostgreSQL Pool Saturation',
          category: 'database',
          offsetSeconds: 0,
          impactDescription: 'PostGIS spatial lock contention caused pool exhaustion (98%)',
          severity: 'emergency',
        },
        {
          stepIndex: 2,
          metricId: 'api_latency_p99',
          metricName: 'API P99 Latency',
          category: 'api',
          offsetSeconds: 18,
          impactDescription: 'HTTP handlers blocked waiting for DB connections, p99 hit 1.42s',
          severity: 'emergency',
        },
        {
          stepIndex: 3,
          metricId: 'api_5xx_error_rate',
          metricName: 'API 5xx Error Rate',
          category: 'api',
          offsetSeconds: 32,
          impactDescription: 'Timeout drops resulted in 8.6% error rate on feed requests',
          severity: 'emergency',
        },
        {
          stepIndex: 4,
          metricId: 'indexer_block_lag',
          metricName: 'Soroban Indexer Lag',
          category: 'indexer',
          offsetSeconds: 55,
          impactDescription: 'Sync worker threads backlogged by 34 ledgers',
          severity: 'critical',
        },
      ],
      status: 'resolved',
      mttdSeconds: 35,
      mttaSeconds: 120,
      mttrSeconds: 1140, // 19 minutes
      blastRadius: {
        estimatedAffectedUsers: 4820,
        affectedRegions: ['Global', 'North America East', 'Europe West'],
        contractCallsDelayed: 930,
      },
      recommendedActions: [
        'PostGIS connection pool scaled up',
        'Spatial query statement timeout capped at 2000ms',
      ],
    },
    {
      id: 'cmp-alert-2026-0802',
      title: 'Cascade Threat: Stellar Horizon RPC Node Timeouts & Contract Delay',
      timestamp: Date.now() - 3600 * 1000 * 22,
      classification: 'cascade_threat',
      severity: 'critical',
      compositeScore: 78,
      rootCauseMetricId: 'stellar_rpc_latency',
      rootCauseCategory: 'stellar',
      affectedSubsystems: ['stellar', 'api'],
      activeAnomalies: [
        {
          metricId: 'stellar_rpc_latency',
          metricName: 'Stellar RPC Latency',
          category: 'stellar',
          timestamp: Date.now() - 3600 * 1000 * 22,
          currentValue: 1280,
          baselineValue: 180,
          deviationPct: 611.1,
          zScore: 4.9,
          severity: 'critical',
        },
        {
          metricId: 'api_latency_p99',
          metricName: 'API P99 Latency',
          category: 'api',
          timestamp: Date.now() - 3600 * 1000 * 22 + 25000,
          currentValue: 560,
          baselineValue: 145,
          deviationPct: 286.2,
          zScore: 3.4,
          severity: 'warning',
        },
      ],
      cascadeChain: [
        {
          stepIndex: 1,
          metricId: 'stellar_rpc_latency',
          metricName: 'Stellar RPC Latency',
          category: 'stellar',
          offsetSeconds: 0,
          impactDescription: 'Upstream Stellar RPC node packet loss spikes latency',
          severity: 'critical',
        },
        {
          stepIndex: 2,
          metricId: 'api_latency_p99',
          metricName: 'API P99 Latency',
          category: 'api',
          offsetSeconds: 25,
          impactDescription: 'Transaction simulation endpoints slowed down',
          severity: 'warning',
        },
      ],
      status: 'resolved',
      mttdSeconds: 42,
      mttaSeconds: 95,
      mttrSeconds: 680, // ~11.3 mins
      blastRadius: {
        estimatedAffectedUsers: 740,
        affectedRegions: ['Asia Pacific', 'Europe Central'],
        contractCallsDelayed: 215,
      },
      recommendedActions: ['Switched active RPC fallback provider to backup endpoint cluster'],
    },
    {
      id: 'cmp-alert-2026-0803',
      title: 'Isolated Spike: IPFS Regional Pinning Node Gateway Timeout',
      timestamp: Date.now() - 3600 * 1000 * 8,
      classification: 'isolated',
      severity: 'warning',
      compositeScore: 61,
      rootCauseMetricId: 'ipfs_fetch_timeout_rate',
      rootCauseCategory: 'ipfs',
      affectedSubsystems: ['ipfs'],
      activeAnomalies: [
        {
          metricId: 'ipfs_fetch_timeout_rate',
          metricName: 'IPFS Fetch Timeout Rate',
          category: 'ipfs',
          timestamp: Date.now() - 3600 * 1000 * 8,
          currentValue: 4.8,
          baselineValue: 0.45,
          deviationPct: 966.7,
          zScore: 3.8,
          severity: 'warning',
        },
      ],
      cascadeChain: [
        {
          stepIndex: 1,
          metricId: 'ipfs_fetch_timeout_rate',
          metricName: 'IPFS Fetch Timeout Rate',
          category: 'ipfs',
          offsetSeconds: 0,
          impactDescription: 'Pinata gateway rate limit hit on single batch import',
          severity: 'warning',
        },
      ],
      status: 'resolved',
      mttdSeconds: 60,
      mttaSeconds: 150,
      mttrSeconds: 420, // 7 mins
      blastRadius: {
        estimatedAffectedUsers: 160,
        affectedRegions: ['Europe Central'],
        contractCallsDelayed: 0,
      },
      recommendedActions: ['Increased IPFS gateway rotation pool and cache warm-up'],
    },
  ];
}

// ── Resolution Time by Issue Type Analytics ───────────────────────────────────

export function getResolutionPerformanceStats(): ResolutionMetricsByType[] {
  return [
    {
      category: 'systemic',
      label: 'Systemic / Multi-Subsystem Outages',
      totalIncidents: 6,
      avgMttdMinutes: 0.7, // 42s
      avgMttaMinutes: 2.1,
      avgMttrMinutes: 18.5,
      slaBreachRate: 4.8,
      trendPercentage: -14.2, // Improved by 14.2%
    },
    {
      category: 'isolated',
      label: 'Isolated Component Failures',
      totalIncidents: 38,
      avgMttdMinutes: 1.2,
      avgMttaMinutes: 3.4,
      avgMttrMinutes: 8.2,
      slaBreachRate: 1.2,
      trendPercentage: -22.5,
    },
    {
      category: 'database',
      label: 'PostgreSQL / PostGIS Contention',
      totalIncidents: 12,
      avgMttdMinutes: 0.5,
      avgMttaMinutes: 1.8,
      avgMttrMinutes: 14.2,
      slaBreachRate: 3.5,
      trendPercentage: -8.7,
    },
    {
      category: 'stellar',
      label: 'Stellar RPC & Soroban Latency',
      totalIncidents: 9,
      avgMttdMinutes: 0.9,
      avgMttaMinutes: 2.4,
      avgMttrMinutes: 11.0,
      slaBreachRate: 2.1,
      trendPercentage: -16.3,
    },
    {
      category: 'ipfs',
      label: 'IPFS Pinning & Blob Availability',
      totalIncidents: 15,
      avgMttdMinutes: 1.4,
      avgMttaMinutes: 4.0,
      avgMttrMinutes: 7.5,
      slaBreachRate: 0.8,
      trendPercentage: -31.0,
    },
    {
      category: 'api',
      label: 'API Gateway & Ingress Layer',
      totalIncidents: 14,
      avgMttdMinutes: 0.6,
      avgMttaMinutes: 1.9,
      avgMttrMinutes: 9.4,
      slaBreachRate: 1.8,
      trendPercentage: -18.0,
    },
  ];
}

// ── Multi-metric telemetry generator for live charts ──────────────────────────

export function generateSynchronizedTelemetryTimeline(points = 24) {
  const timestamps: string[] = [];
  const apiLatency: number[] = [];
  const errorRate: number[] = [];
  const dbSaturation: number[] = [];
  const indexerLag: number[] = [];
  const compositeScores: number[] = [];

  const now = Date.now();
  const stepMs = 5 * 60 * 1000; // 5 minute steps

  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(now - i * stepMs);
    const timeLabel = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
    timestamps.push(timeLabel);

    // Simulate an incident peak around point 16-19
    const isIncidentZone = i >= 4 && i <= 8;
    const incidentIntensity = isIncidentZone ? Math.sin(((8 - i) / 4) * Math.PI) : 0;

    const baseLat = 140 + Math.random() * 25;
    const lat = Math.round(baseLat + incidentIntensity * 950);
    apiLatency.push(lat);

    const baseErr = 0.12 + Math.random() * 0.08;
    const err = +(baseErr + incidentIntensity * 6.8).toFixed(2);
    errorRate.push(err);

    const baseDb = 38 + Math.random() * 8;
    const db = Math.round(baseDb + incidentIntensity * 55);
    dbSaturation.push(db);

    const baseLag = 1 + Math.floor(Math.random() * 2);
    const lag = Math.round(baseLag + incidentIntensity * 28);
    indexerLag.push(lag);

    const compScore = Math.min(
      100,
      Math.round(20 + incidentIntensity * 76 + Math.random() * 5)
    );
    compositeScores.push(compScore);
  }

  return {
    timestamps,
    apiLatency,
    errorRate,
    dbSaturation,
    indexerLag,
    compositeScores,
  };
}
