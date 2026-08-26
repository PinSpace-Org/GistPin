export interface ErrorCategory {
  code: string;
  name: string;
  count: number;
  percentage: number;
  avgResolutionMs: number;
  causes: string[];
  children?: ErrorCategory[];
}

export interface ErrorTrend {
  date: string;
  clientErrors: number;
  serverErrors: number;
  authErrors: number;
  rateLimitErrors: number;
}

export interface ErrorResolution {
  errorType: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

const ERROR_TAXONOMY: ErrorCategory = {
  code: 'ALL',
  name: 'All Errors',
  count: 24891,
  percentage: 100,
  avgResolutionMs: 3420,
  causes: ['Various systemic issues'],
  children: [
    {
      code: '4xx',
      name: 'Client Errors (4xx)',
      count: 16234,
      percentage: 65.2,
      avgResolutionMs: 1200,
      causes: ['Invalid request syntax', 'Missing required fields', 'Rate limiting', 'Authentication failures'],
      children: [
        { code: '400', name: 'Bad Request', count: 4821, percentage: 19.4, avgResolutionMs: 800, causes: ['Malformed JSON', 'Missing required parameters', 'Invalid query syntax'] },
        { code: '401', name: 'Unauthorized', count: 3892, percentage: 15.6, avgResolutionMs: 1100, causes: ['Expired token', 'Invalid API key', 'Missing authorization header'] },
        { code: '403', name: 'Forbidden', count: 2104, percentage: 8.4, avgResolutionMs: 1400, causes: ['Insufficient permissions', 'Account suspended', 'IP blocked'] },
        { code: '404', name: 'Not Found', count: 3217, percentage: 12.9, avgResolutionMs: 600, causes: ['Deleted gist', 'Invalid resource ID', 'Version mismatch'] },
        { code: '429', name: 'Rate Limited', count: 2200, percentage: 8.8, avgResolutionMs: 2100, causes: ['Burst limit exceeded', 'Daily quota hit', 'Per-endpoint throttle'] },
      ],
    },
    {
      code: '5xx',
      name: 'Server Errors (5xx)',
      count: 5632,
      percentage: 22.6,
      avgResolutionMs: 8900,
      causes: ['Database connection failures', 'IPFS timeout', 'Memory exhaustion', 'External service downtime'],
      children: [
        { code: '500', name: 'Internal Server Error', count: 2340, percentage: 9.4, avgResolutionMs: 7200, causes: ['Unhandled exceptions', 'Null reference', 'Database deadlock'] },
        { code: '502', name: 'Bad Gateway', count: 1180, percentage: 4.7, avgResolutionMs: 12400, causes: ['Upstream timeout', 'Load balancer failure', 'Service mesh issue'] },
        { code: '503', name: 'Service Unavailable', count: 1212, percentage: 4.9, avgResolutionMs: 9800, causes: ['Deployment in progress', 'Circuit breaker open', 'Resource exhaustion'] },
        { code: '504', name: 'Gateway Timeout', count: 900, percentage: 3.6, avgResolutionMs: 14200, causes: ['Slow database query', 'External API latency', 'Network partition'] },
      ],
    },
    {
      code: 'AUTH',
      name: 'Authentication Errors',
      count: 3025,
      percentage: 12.2,
      avgResolutionMs: 4500,
      causes: ['Key rotation issues', 'Session expiry', 'Multi-device conflicts'],
    },
  ],
};

const ERROR_TRENDS: ErrorTrend[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-05-27');
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clientErrors: Math.round(450 + Math.sin(i * 0.4) * 80 + (Math.random() - 0.5) * 60),
    serverErrors: Math.round(150 + Math.sin(i * 0.3) * 50 + (Math.random() - 0.5) * 40),
    authErrors: Math.round(90 + Math.sin(i * 0.5) * 30 + (Math.random() - 0.5) * 20),
    rateLimitErrors: Math.round(65 + Math.sin(i * 0.6) * 25 + (Math.random() - 0.5) * 15),
  };
});

const RESOLUTION_TIMES: ErrorResolution[] = [
  { errorType: '400 Bad Request', p50: 400, p95: 1800, p99: 3200, avg: 800 },
  { errorType: '401 Unauthorized', p50: 600, p95: 2400, p99: 4100, avg: 1100 },
  { errorType: '403 Forbidden', p50: 800, p95: 3100, p99: 5200, avg: 1400 },
  { errorType: '404 Not Found', p50: 200, p95: 1200, p99: 2100, avg: 600 },
  { errorType: '429 Rate Limited', p50: 1500, p95: 4200, p99: 6800, avg: 2100 },
  { errorType: '500 Internal', p50: 3200, p95: 14000, p99: 28000, avg: 7200 },
  { errorType: '502 Bad Gateway', p50: 6400, p95: 24000, p99: 42000, avg: 12400 },
  { errorType: '503 Unavailable', p50: 4800, p95: 20000, p99: 35000, avg: 9800 },
  { errorType: '504 Timeout', p50: 7200, p95: 28000, p99: 48000, avg: 14200 },
];

export function getErrorTaxonomy(): ErrorCategory {
  return ERROR_TAXONOMY;
}

export function getErrorTrends(): ErrorTrend[] {
  return ERROR_TRENDS;
}

export function getResolutionTimes(): ErrorResolution[] {
  return RESOLUTION_TIMES;
}

export function getErrorSummary(): { totalErrors: number; topError: string; avgResolution: number; errorRate: number } {
  const flatErrors = (ERROR_TAXONOMY.children ?? []).flatMap((c) => c.children ?? [c]);
  const topError = flatErrors.reduce((best, e) => (e.count > best.count ? e : best), flatErrors[0]);
  return {
    totalErrors: ERROR_TAXONOMY.count,
    topError: topError.name,
    avgResolution: ERROR_TAXONOMY.avgResolutionMs,
    errorRate: 2.3,
  };
}

export function categorizeError(statusCode: number): string {
  if (statusCode < 400) return 'success';
  if (statusCode < 500) return 'client';
  return 'server';
}
