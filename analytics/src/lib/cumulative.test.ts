import { describe, it, expect } from 'vitest';
import {
  CUMULATIVE_MODES,
  DEFAULT_CUMULATIVE_MODE,
  cumulativeHasData,
  cumulativeTotals,
  isCumulativeMode,
  parseCumulativeMode,
  serializeCumulativeMode,
  toggleCumulativeMode,
} from './cumulative';

describe('cumulativeTotals', () => {
  it('accumulates a running total across buckets', () => {
    const result = cumulativeTotals([5, 3, 2]);
    expect(result.totals).toEqual([5, 8, 10]);
    expect(result.startIndex).toBe(0);
    expect(result.hasData).toBe(true);
  });

  it('starts the offset at the first bucket holding data', () => {
    const result = cumulativeTotals([null, undefined, 4, 1]);
    expect(result.startIndex).toBe(2);
    expect(result.totals).toEqual([null, null, 4, 5]);
  });

  it('keeps interior blank buckets blank without resetting the total', () => {
    expect(cumulativeTotals([2, null, 3]).totals).toEqual([2, null, 5]);
  });

  it('handles an all-blank series', () => {
    const result = cumulativeTotals([null, null]);
    expect(result).toEqual({ totals: [null, null], startIndex: null, hasData: false });
  });

  it('handles an empty series', () => {
    expect(cumulativeTotals([])).toEqual({ totals: [], startIndex: null, hasData: false });
  });

  it('keeps a zero bucket as real data', () => {
    const result = cumulativeTotals([0, 4]);
    expect(result.startIndex).toBe(0);
    expect(result.totals).toEqual([0, 4]);
  });
});

describe('cumulativeHasData', () => {
  it('detects data presence', () => {
    expect(cumulativeHasData([null, 0])).toBe(true);
    expect(cumulativeHasData([null, undefined, NaN])).toBe(false);
  });
});

describe('cumulative mode parsing', () => {
  it('exposes the supported modes', () => {
    expect(CUMULATIVE_MODES).toEqual(['per-bucket', 'cumulative']);
  });

  it('accepts both modes', () => {
    expect(isCumulativeMode('cumulative')).toBe(true);
    expect(isCumulativeMode('per-bucket')).toBe(true);
    expect(isCumulativeMode('weekly')).toBe(false);
  });

  it('parses valid values and falls back for the rest', () => {
    expect(parseCumulativeMode('cumulative')).toBe('cumulative');
    expect(parseCumulativeMode('per-bucket')).toBe('per-bucket');
    expect(parseCumulativeMode('nope')).toBe(DEFAULT_CUMULATIVE_MODE);
    expect(parseCumulativeMode(null)).toBe(DEFAULT_CUMULATIVE_MODE);
    expect(parseCumulativeMode(undefined)).toBe(DEFAULT_CUMULATIVE_MODE);
    expect(parseCumulativeMode('')).toBe(DEFAULT_CUMULATIVE_MODE);
  });

  it('round-trips through serialize', () => {
    expect(parseCumulativeMode(serializeCumulativeMode('cumulative'))).toBe('cumulative');
  });

  it('toggles between views', () => {
    expect(toggleCumulativeMode('per-bucket')).toBe('cumulative');
    expect(toggleCumulativeMode('cumulative')).toBe('per-bucket');
  });
});
