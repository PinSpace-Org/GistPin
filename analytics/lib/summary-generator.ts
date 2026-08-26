export type TrafficLight = 'green' | 'amber' | 'red';

export interface MetricSnapshot {
  label: string;
  value: string;
  previousValue: string;
  changePct: number;
  trafficLight: TrafficLight;
  unit?: string;
}

export interface WeekOverWeek {
  metric: string;
  current: number;
  previous: number;
  changePct: number;
  trend: 'up' | 'down' | 'flat';
}

export interface Risk {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  recommendation: string;
  owner: string;
}

export interface ExecutiveSummary {
  snapshot: MetricSnapshot[];
  weekOverWeek: WeekOverWeek[];
  topRisks: Risk[];
  overallHealth: TrafficLight;
  reportDate: string;
}

const KEY_METRICS: MetricSnapshot[] = [
  { label: 'Total Gists (30d)',      value: '48,392',  previousValue: '45,810',  changePct: 5.6,  trafficLight: 'green' },
  { label: 'Active Wallets',          value: '12,847',  previousValue: '12,210',  changePct: 5.2,  trafficLight: 'green' },
  { label: 'Revenue (XLM)',          value: '1,284',   previousValue: '1,198',   changePct: 7.2,  trafficLight: 'green' },
  { label: 'Avg Response Time (ms)',  value: '142',     previousValue: '138',     changePct: 2.9,  trafficLight: 'amber' },
  { label: 'Error Rate',             value: '0.34%',   previousValue: '0.28%',   changePct: 21.4, trafficLight: 'red' },
  { label: 'Uptime',                 value: '99.94%',  previousValue: '99.97%',  changePct: -0.03,trafficLight: 'green' },
  { label: 'Moderation Queue',       value: '43',      previousValue: '38',      changePct: 13.2, trafficLight: 'amber' },
  { label: 'IPFS Pin Success',       value: '98.7%',   previousValue: '99.1%',   changePct: -0.4, trafficLight: 'amber' },
];

const WEEK_OVER_WEEK: WeekOverWeek[] = [
  { metric: 'New Gists Created',      current: 12100, previous: 11450, changePct: 5.7,  trend: 'up' },
  { metric: 'Tips Processed',          current: 8420,  previous: 7980,  changePct: 5.5,  trend: 'up' },
  { metric: 'Search Queries',          current: 34500, previous: 31200, changePct: 10.6, trend: 'up' },
  { metric: 'Avg Session Duration',    current: 4.2,   previous: 4.5,   changePct: -6.7, trend: 'down' },
  { metric: 'Bounce Rate',             current: 32.1,  previous: 30.8,  changePct: 4.2,  trend: 'up' },
  { metric: 'Content Flags',           current: 186,   previous: 172,   changePct: 8.1,  trend: 'up' },
  { metric: 'API Latency (p95)',       current: 210,   previous: 198,   changePct: 6.1,  trend: 'up' },
  { metric: 'New Wallet Registrations',current: 342,   previous: 310,   changePct: 10.3, trend: 'up' },
];

const TOP_RISKS: Risk[] = [
  {
    id: 'RISK-001',
    title: 'Rising Error Rate on API Gateway',
    severity: 'high',
    impact: 'Error rate increased 21% week-over-week. May affect third-party integrations and client trust. 5xx responses concentrated during peak hours (18:00–22:00 UTC).',
    recommendation: 'Scale gateway pods to handle peak traffic; investigate connection pool exhaustion in auth service.',
    owner: 'Platform Engineering',
  },
  {
    id: 'RISK-002',
    title: 'Moderation Queue Growing',
    severity: 'medium',
    impact: 'Queue depth increased from 38 to 43 items. Average response time approaching 2.5h SLA threshold. Auto-mod accuracy holding at 87%.',
    recommendation: 'Add overflow moderation capacity; review auto-mod model for Asian-language content where false negatives are highest.',
    owner: 'Trust & Safety',
  },
  {
    id: 'RISK-003',
    title: 'IPFS Pin Success Rate Declining',
    severity: 'medium',
    impact: 'Pin success dropped from 99.1% to 98.7%. Primarily affecting Latin America and Africa regions due to gateway latency.',
    recommendation: 'Evaluate regional IPFS gateway providers; increase pin retry window from 30s to 60s.',
    owner: 'Infrastructure',
  },
];

const OVERALL_HEALTH: TrafficLight = 'amber';

function getTrafficLightColor(light: TrafficLight): string {
  switch (light) {
    case 'green':  return '#16a34a';
    case 'amber':  return '#d97706';
    case 'red':    return '#dc2626';
  }
}

function getTrafficLightBg(light: TrafficLight): string {
  switch (light) {
    case 'green':  return '#dcfce7';
    case 'amber':  return '#fef9c3';
    case 'red':    return '#fee2e2';
  }
}

export function getExecutiveSummary(): ExecutiveSummary {
  return {
    snapshot: KEY_METRICS,
    weekOverWeek: WEEK_OVER_WEEK,
    topRisks: TOP_RISKS,
    overallHealth: OVERALL_HEALTH,
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

export { getTrafficLightColor, getTrafficLightBg };
