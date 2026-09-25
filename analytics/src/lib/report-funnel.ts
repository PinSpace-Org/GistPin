import { formatCompactNumber, formatPercent } from './format';

export interface FunnelInput {
  gistsTotal: number | null | undefined;
  reported: number | null | undefined;
  hidden: number | null | undefined;
}

export interface FunnelStep {
  key: 'gists' | 'reported' | 'hidden';
  label: string;
  count: number;
  percentOfTotal: number | null;
  percentOfPrevious: number | null;
  tooltip: string;
}

export interface ReportFunnel {
  steps: FunnelStep[];
  isEmpty: boolean;
}

function safeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return 0;
  return value;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function buildReportFunnel(input: FunnelInput): ReportFunnel {
  const gistsTotal = safeCount(input?.gistsTotal);
  const reported = safeCount(input?.reported);
  const hidden = safeCount(input?.hidden);

  const steps: FunnelStep[] = [
    {
      key: 'gists',
      label: 'Gists',
      count: gistsTotal,
      percentOfTotal: ratio(gistsTotal, gistsTotal),
      percentOfPrevious: null,
      tooltip: 'All gists visible in the selected area and time range.',
    },
    {
      key: 'reported',
      label: 'Reported',
      count: reported,
      percentOfTotal: ratio(reported, gistsTotal),
      percentOfPrevious: ratio(reported, gistsTotal),
      tooltip: 'Gists with at least one moderation report from a user.',
    },
    {
      key: 'hidden',
      label: 'Hidden',
      count: hidden,
      percentOfTotal: ratio(hidden, gistsTotal),
      percentOfPrevious: ratio(hidden, reported),
      tooltip: 'Gists a moderator has hidden from the public listings.',
    },
  ];

  return { steps, isEmpty: gistsTotal === 0 && reported === 0 && hidden === 0 };
}

export function describeFunnelStep(step: FunnelStep): string {
  return `${step.label}: ${formatCompactNumber(step.count)} (${formatPercent(
    step.percentOfTotal,
  )} of all gists)`;
}
