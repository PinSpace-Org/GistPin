import { describe, it, expect } from 'vitest';
import {
  formatCompactNumber,
  formatPercent,
  formatDuration,
  formatRelativeTime,
  formatIsoToLocal,
  formatIsoToUtc,
  truncateAddress,
} from './format';

describe('formatCompactNumber', () => {
  it('compacts large numbers', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(1500000)).toBe('1.5M');
  });

  it('handles null/undefined/NaN safely', () => {
    expect(formatCompactNumber(null)).toBe('—');
    expect(formatCompactNumber(undefined)).toBe('—');
    expect(formatCompactNumber(NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats a 0-1 fraction as a percentage', () => {
    expect(formatPercent(0.256, 'en-US', 1)).toBe('25.6%');
  });

  it('handles null/undefined/NaN safely', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats seconds/minutes/hours/days', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(3661)).toBe('1h 1m');
    expect(formatDuration(90000)).toBe('1d 1h');
  });

  it('handles null/undefined/NaN/negative safely', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('formats a past date', () => {
    expect(formatRelativeTime('2025-12-31T23:55:00.000Z', now)).toBe('5 minutes ago');
  });

  it('formats a future date', () => {
    expect(formatRelativeTime('2026-01-01T02:00:00.000Z', now)).toBe('in 2 hours');
  });

  it('handles null/undefined/invalid safely', () => {
    expect(formatRelativeTime(null, now)).toBe('—');
    expect(formatRelativeTime('not-a-date', now)).toBe('—');
  });
});

describe('formatIsoToLocal / formatIsoToUtc', () => {
  it('handles null/undefined/invalid safely', () => {
    expect(formatIsoToLocal(null)).toBe('—');
    expect(formatIsoToLocal('nonsense')).toBe('—');
    expect(formatIsoToUtc(undefined)).toBe('—');
    expect(formatIsoToUtc('nonsense')).toBe('—');
  });

  it('formats a valid ISO string in UTC', () => {
    expect(formatIsoToUtc('2026-01-01T12:00:00.000Z')).toContain('UTC');
  });
});

describe('truncateAddress', () => {
  it('truncates a long Stellar address', () => {
    expect(truncateAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')).toBe('GABCDE…7890');
  });

  it('leaves a short address untouched', () => {
    expect(truncateAddress('GSHORT')).toBe('GSHORT');
  });

  it('handles null/undefined/empty safely', () => {
    expect(truncateAddress(null)).toBe('—');
    expect(truncateAddress(undefined)).toBe('—');
    expect(truncateAddress('')).toBe('—');
  });
});
