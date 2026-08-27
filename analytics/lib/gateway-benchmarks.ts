export interface GatewayBenchmarks {
  name: string;
  slug: string;
  responseTimeP50: number[];
  responseTimeP95: number[];
  availability: number[];
  freshnessScore: number[];
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  avgLatency: number;
}

export interface GatewayComparisonResult {
  gateways: GatewayBenchmarks[];
  labels: string[];
  bestGateway: string;
  overallScore: Record<string, number>;
}

const GATEWAYS: GatewayBenchmarks[] = [
  {
    name: 'Pinata',
    slug: 'pinata',
    responseTimeP50: Array.from({ length: 30 }, () => Math.round(120 + (Math.random() - 0.5) * 40)),
    responseTimeP95: Array.from({ length: 30 }, () => Math.round(340 + (Math.random() - 0.5) * 80)),
    availability: Array.from({ length: 30 }, () => parseFloat((99.8 + Math.random() * 0.2).toFixed(2))),
    freshnessScore: Array.from({ length: 30 }, () => parseFloat((92 + Math.random() * 8).toFixed(1))),
    status: 'healthy',
    uptime: 99.97,
    avgLatency: 124,
  },
  {
    name: 'Infura',
    slug: 'infura',
    responseTimeP50: Array.from({ length: 30 }, () => Math.round(155 + (Math.random() - 0.5) * 50)),
    responseTimeP95: Array.from({ length: 30 }, () => Math.round(420 + (Math.random() - 0.5) * 100)),
    availability: Array.from({ length: 30 }, () => parseFloat((99.5 + Math.random() * 0.4).toFixed(2))),
    freshnessScore: Array.from({ length: 30 }, () => parseFloat((88 + Math.random() * 10).toFixed(1))),
    status: 'healthy',
    uptime: 99.62,
    avgLatency: 158,
  },
  {
    name: 'dweb.link',
    slug: 'dweb-link',
    responseTimeP50: Array.from({ length: 30 }, () => Math.round(210 + (Math.random() - 0.5) * 80)),
    responseTimeP95: Array.from({ length: 30 }, () => Math.round(650 + (Math.random() - 0.5) * 150)),
    availability: Array.from({ length: 30 }, () => parseFloat((97.5 + Math.random() * 2).toFixed(2))),
    freshnessScore: Array.from({ length: 30 }, () => parseFloat((78 + Math.random() * 15).toFixed(1))),
    status: 'degraded',
    uptime: 97.84,
    avgLatency: 215,
  },
  {
    name: 'Cloudflare IPFS',
    slug: 'cloudflare',
    responseTimeP50: Array.from({ length: 30 }, () => Math.round(95 + (Math.random() - 0.5) * 30)),
    responseTimeP95: Array.from({ length: 30 }, () => Math.round(260 + (Math.random() - 0.5) * 60)),
    availability: Array.from({ length: 30 }, () => parseFloat((99.9 + Math.random() * 0.1).toFixed(2))),
    freshnessScore: Array.from({ length: 30 }, () => parseFloat((95 + Math.random() * 5).toFixed(1))),
    status: 'healthy',
    uptime: 99.94,
    avgLatency: 98,
  },
  {
    name: 'IPFS.io',
    slug: 'ipfs-io',
    responseTimeP50: Array.from({ length: 30 }, () => Math.round(180 + (Math.random() - 0.5) * 60)),
    responseTimeP95: Array.from({ length: 30 }, () => Math.round(540 + (Math.random() - 0.5) * 120)),
    availability: Array.from({ length: 30 }, () => parseFloat((98.2 + Math.random() * 1.5).toFixed(2))),
    freshnessScore: Array.from({ length: 30 }, () => parseFloat((84 + Math.random() * 12).toFixed(1))),
    status: 'degraded',
    uptime: 98.47,
    avgLatency: 185,
  },
];

export function getGatewayComparisonData(): GatewayComparisonResult {
  const labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date('2026-05-27');
    d.setDate(d.getDate() - (29 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const overallScore: Record<string, number> = {};
  for (const gw of GATEWAYS) {
    const avgAvail = gw.availability.reduce((a, b) => a + b, 0) / gw.availability.length;
    const avgFresh = gw.freshnessScore.reduce((a, b) => a + b, 0) / gw.freshnessScore.length;
    const speedScore = Math.max(0, 100 - (gw.avgLatency / 5));
    overallScore[gw.slug] = parseFloat(((avgAvail * 0.4) + (avgFresh * 0.3) + (speedScore * 0.3)).toFixed(1));
  }

  const bestGateway = Object.entries(overallScore).sort(([, a], [, b]) => b - a)[0][0];

  return { gateways: GATEWAYS, labels, bestGateway, overallScore };
}

export function getGatewayHealthStatus(gateway: GatewayBenchmarks): {
  color: string;
  label: string;
} {
  switch (gateway.status) {
    case 'healthy':
      return { color: '#16a34a', label: 'Healthy' };
    case 'degraded':
      return { color: '#d97706', label: 'Degraded' };
    case 'down':
      return { color: '#dc2626', label: 'Down' };
  }
}

export function rankGateways(result: GatewayComparisonResult): { slug: string; score: number; name: string }[] {
  return result.gateways
    .map((gw) => ({ slug: gw.slug, score: result.overallScore[gw.slug], name: gw.name }))
    .sort((a, b) => b.score - a.score);
}
