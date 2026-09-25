import { describe, it, expect } from 'vitest';
import { HIDDEN_EVENT_TYPES, buildHiddenRateSeries } from './hidden-rate';

const BUCKETS = ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', '2026-01-03T00:00:00.000Z'];

describe('hidden rate series', () => {
  it('exposes the two moderation event types it tracks', () => {
    expect(HIDDEN_EVENT_TYPES).toEqual(['gist_hidden', 'gist_unhidden']);
  });

  it('builds one point per bucket', () => {
    const series = buildHiddenRateSeries(BUCKETS, []);
    expect(series.points.map((point) => point.start)).toEqual(BUCKETS);
    expect(series.isEmpty).toBe(true);
  });

  it('counts hidden events into their bucket', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_hidden', createdAt: '2026-01-02T05:00:00.000Z' },
      { type: 'gist_hidden', createdAt: '2026-01-02T06:00:00.000Z' },
    ]);
    expect(series.points[1].hidden).toBe(2);
    expect(series.totalHidden).toBe(2);
    expect(series.netHidden).toBe(2);
  });

  it('nets unhide events against hides', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_hidden', createdAt: '2026-01-01T05:00:00.000Z' },
      { type: 'gist_unhidden', createdAt: '2026-01-02T05:00:00.000Z' },
    ]);
    expect(series.points[0].net).toBe(1);
    expect(series.points[1].net).toBe(-1);
    expect(series.points[2].runningNet).toBe(0);
    expect(series.netHidden).toBe(0);
  });

  it('tracks the running net across buckets', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_hidden', createdAt: '2026-01-01T05:00:00.000Z' },
      { type: 'gist_hidden', createdAt: '2026-01-02T05:00:00.000Z' },
      { type: 'gist_unhidden', createdAt: '2026-01-03T05:00:00.000Z' },
    ]);
    expect(series.points.map((point) => point.runningNet)).toEqual([1, 2, 1]);
  });

  it('ignores unrelated event types', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_posted', createdAt: '2026-01-01T05:00:00.000Z' },
    ]);
    expect(series.totalHidden).toBe(0);
    expect(series.isEmpty).toBe(true);
  });

  it('ignores events with invalid timestamps', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_hidden', createdAt: 'nope' },
      { type: 'gist_hidden', createdAt: null },
    ]);
    expect(series.totalHidden).toBe(0);
  });

  it('ignores events before the first bucket', () => {
    const series = buildHiddenRateSeries(BUCKETS, [
      { type: 'gist_hidden', createdAt: '2025-12-31T00:00:00.000Z' },
    ]);
    expect(series.totalHidden).toBe(0);
  });

  it('handles an empty event log', () => {
    const series = buildHiddenRateSeries([], []);
    expect(series.points).toEqual([]);
    expect(series.isEmpty).toBe(true);
    expect(series.netHidden).toBe(0);
  });
});
