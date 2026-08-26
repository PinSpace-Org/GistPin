export type TrafficLight = 'green' | 'yellow' | 'red';

export interface KeyMetric {
  name: string;
  current: string;
  previous: string;
  change: number;
  unit: string;
  light: TrafficLight;
}

export interface WeekComparison {
  metric: string;
  thisWeek: number;
  lastWeek: number;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

export interface Risk {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  affectedArea: string;
  suggestedAction: string;
}

export const KEY_METRICS: KeyMetric[] = [
  { name: 'Total Gists', current: '142,380', previous: '128,450', change: 10.8, unit: '', light: 'green' },
  { name: 'Daily Active Users', current: '8,420', previous: '7,890', change: 6.7, unit: '', light: 'green' },
  { name: 'Avg Session Duration', current: '4m 32s', previous: '4m 18s', change: 5.4, unit: 's', light: 'green' },
  { name: 'Tip Volume', current: '$12,840', previous: '$11,200', change: 14.6, unit: '$', light: 'green' },
  { name: 'Toxicity Score', current: '0.18', previous: '0.15', change: 20.0, unit: '', light: 'yellow' },
  { name: 'Moderation Rate', current: '94.2%', previous: '96.1%', change: -2.0, unit: '%', light: 'yellow' },
  { name: 'API Latency (p95)', current: '245ms', previous: '198ms', change: 23.7, unit: 'ms', light: 'red' },
  { name: 'Uptime', current: '99.94%', previous: '99.97%', change: -0.03, unit: '%', light: 'green' },
];

export const WEEK_COMPARISON: WeekComparison[] = [
  { metric: 'Gists Created', thisWeek: 21400, lastWeek: 19800, change: 8.1, trend: 'up' },
  { metric: 'Comments', thisWeek: 45200, lastWeek: 42100, change: 7.4, trend: 'up' },
  { metric: 'Tips Sent', thisWeek: 1840, lastWeek: 1620, change: 13.6, trend: 'up' },
  { metric: 'Reports Filed', thisWeek: 342, lastWeek: 298, change: 14.8, trend: 'up' },
  { metric: 'New Users', thisWeek: 2840, lastWeek: 2650, change: 7.2, trend: 'up' },
  { metric: 'Locations Discovered', thisWeek: 156, lastWeek: 142, change: 9.9, trend: 'up' },
  { metric: 'Avg Response Time', thisWeek: 4.2, lastWeek: 3.8, change: 10.5, trend: 'up' },
  { metric: 'Error Rate', thisWeek: 0.12, lastWeek: 0.08, change: 50.0, trend: 'up' },
];

export const TOP_RISKS: Risk[] = [
  {
    id: 'risk-1',
    title: 'API Latency Degradation',
    severity: 'critical',
    description: 'p95 latency increased 23.7% week-over-week, exceeding the 200ms SLA threshold. Root cause analysis indicates database connection pool saturation.',
    affectedArea: 'API Infrastructure',
    suggestedAction: 'Scale database connection pool from 20 to 50 connections and implement query caching for frequently accessed endpoints.',
  },
  {
    id: 'risk-2',
    title: 'Rising Toxicity Score',
    severity: 'high',
    description: 'Platform toxicity score rose from 0.15 to 0.18 (+20%). Concentrated in South America and Africa regions. Automated moderation is catching most but human review backlog is growing.',
    affectedArea: 'Content Moderation',
    suggestedAction: 'Increase human moderator capacity by 30% and deploy region-specific keyword filters for high-toxicity areas.',
  },
  {
    id: 'risk-3',
    title: 'Moderation Rate Decline',
    severity: 'high',
    description: 'Moderation effectiveness dropped from 96.1% to 94.2%. False positive rate increased slightly, suggesting model drift. New bypass techniques detected.',
    affectedArea: 'Auto-Moderation',
    suggestedAction: 'Retrain moderation model with latest flagged content dataset and review bypass detection rules.',
  },
];

export function getOverallHealthScore(): number {
  const greenCount = KEY_METRICS.filter(m => m.light === 'green').length;
  const yellowCount = KEY_METRICS.filter(m => m.light === 'yellow').length;
  return Math.round(((greenCount * 100 + yellowCount * 60) / (KEY_METRICS.length * 100)) * 100);
}

export function getHealthColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

export function getLightColor(light: TrafficLight): string {
  if (light === 'green') return '#22c55e';
  if (light === 'yellow') return '#eab308';
  return '#ef4444';
}

export function getLightBg(light: TrafficLight): string {
  if (light === 'green') return '#dcfce7';
  if (light === 'yellow') return '#fef3c7';
  return '#fef2f2';
}

export function getSeverityColor(severity: string): string {
  if (severity === 'critical') return '#ef4444';
  if (severity === 'high') return '#f97316';
  return '#eab308';
}
