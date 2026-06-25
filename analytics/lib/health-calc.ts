export interface ComponentHealth {
  name: string;
  uptime: number;      // 0-100
  errorRate: number;   // 0-100
  responseTime: number; // ms
}

export interface HealthScoreResult {
  score: number;        // 0-100
  status: 'healthy' | 'warning' | 'critical';
  components: (ComponentHealth & { score: number })[];
  history: { time: string; score: number }[];
}

/** Weight: uptime 50%, error rate 30%, response time 20% */
function componentScore(c: ComponentHealth): number {
  const uptimeScore = c.uptime;
  const errorScore = Math.max(0, 100 - c.errorRate * 10);
  const rtScore = Math.max(0, 100 - (c.responseTime / 2000) * 100);
  return Math.round(uptimeScore * 0.5 + errorScore * 0.3 + rtScore * 0.2);
}

export function calcHealthScore(components: ComponentHealth[]): HealthScoreResult {
  const scored = components.map((c) => ({ ...c, score: componentScore(c) }));
  const score = Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length);
  const status: HealthScoreResult['status'] =
    score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';

  const now = Date.now();
  const history = Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now - (23 - i) * 3_600_000);
    const label = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const jitter = Math.round((Math.random() - 0.5) * 10);
    return { time: label, score: Math.min(100, Math.max(0, score + jitter)) };
  });

  return { score, status, components: scored, history };
}

export const DEFAULT_COMPONENTS: ComponentHealth[] = [
  { name: 'API Gateway',    uptime: 99.9, errorRate: 0.3, responseTime: 180 },
  { name: 'Gist Indexer',   uptime: 98.7, errorRate: 1.2, responseTime: 320 },
  { name: 'Soroban Bridge', uptime: 97.8, errorRate: 2.1, responseTime: 520 },
  { name: 'IPFS Gateway',   uptime: 99.2, errorRate: 0.8, responseTime: 410 },
  { name: 'Auth Service',   uptime: 100,  errorRate: 0.0, responseTime: 95  },
];
