import { describe, it, expect } from 'vitest';
import { buildReportFunnel, describeFunnelStep } from './report-funnel';

describe('buildReportFunnel', () => {
  it('builds the three stages in order', () => {
    const funnel = buildReportFunnel({ gistsTotal: 100, reported: 10, hidden: 4 });
    expect(funnel.steps.map((step) => step.key)).toEqual(['gists', 'reported', 'hidden']);
    expect(funnel.steps.map((step) => step.count)).toEqual([100, 10, 4]);
  });

  it('computes percentages of the total and of the previous stage', () => {
    const funnel = buildReportFunnel({ gistsTotal: 100, reported: 10, hidden: 4 });
    const [gists, reported, hidden] = funnel.steps;
    expect(gists.percentOfPrevious).toBeNull();
    expect(reported.percentOfTotal).toBe(0.1);
    expect(reported.percentOfPrevious).toBe(0.1);
    expect(hidden.percentOfTotal).toBe(0.04);
    expect(hidden.percentOfPrevious).toBe(0.4);
  });

  it('explains each stage in a tooltip', () => {
    const funnel = buildReportFunnel({ gistsTotal: 100, reported: 10, hidden: 4 });
    for (const step of funnel.steps) expect(step.tooltip.length).toBeGreaterThan(0);
  });

  it('returns null percentages instead of dividing by zero', () => {
    const funnel = buildReportFunnel({ gistsTotal: 0, reported: 0, hidden: 0 });
    expect(funnel.steps.every((step) => step.percentOfTotal === null)).toBe(true);
    expect(funnel.steps[2].percentOfPrevious).toBeNull();
    expect(funnel.isEmpty).toBe(true);
  });

  it('handles a partial funnel where nothing was reported', () => {
    const funnel = buildReportFunnel({ gistsTotal: 50, reported: 0, hidden: 0 });
    expect(funnel.steps[1].percentOfTotal).toBe(0);
    expect(funnel.steps[2].percentOfPrevious).toBeNull();
    expect(funnel.isEmpty).toBe(false);
  });

  it('treats blanks and negatives as zero', () => {
    const funnel = buildReportFunnel({ gistsTotal: null, reported: -5, hidden: Number.NaN });
    expect(funnel.steps.map((step) => step.count)).toEqual([0, 0, 0]);
    expect(funnel.isEmpty).toBe(true);
  });
});

describe('describeFunnelStep', () => {
  it('formats a step with the shared helpers', () => {
    const funnel = buildReportFunnel({ gistsTotal: 200, reported: 50, hidden: 25 });
    expect(describeFunnelStep(funnel.steps[1])).toBe('Reported: 50 (25.0% of all gists)');
  });

  it('shows the placeholder when the total is unknown', () => {
    const funnel = buildReportFunnel({ gistsTotal: 0, reported: 0, hidden: 0 });
    expect(describeFunnelStep(funnel.steps[0])).toBe('Gists: 0 (— of all gists)');
  });
});
