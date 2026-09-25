import { describe, it, expect } from 'vitest';
import { computeLifetimeStats, lifetimeCards, median } from './lifetime-stats';

const NOW = new Date('2026-01-10T00:00:00.000Z');

function record(createdAt: string, expiresAt: string | null) {
  return { createdAt, expiresAt };
}

describe('median', () => {
  it('returns the middle value of an odd set', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the middle pair of an even set', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('returns null for an empty set', () => {
    expect(median([])).toBeNull();
  });
});

describe('computeLifetimeStats', () => {
  it('computes average and median lifetime in seconds', () => {
    const stats = computeLifetimeStats(
      [
        record('2026-01-01T00:00:00.000Z', '2026-01-01T01:00:00.000Z'),
        record('2026-01-01T00:00:00.000Z', '2026-01-01T03:00:00.000Z'),
      ],
      NOW,
    );
    expect(stats.averageSeconds).toBe(2 * 3600);
    expect(stats.medianSeconds).toBe(2 * 3600);
  });

  it('counts gists that have already expired', () => {
    const stats = computeLifetimeStats(
      [
        record('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
        record('2026-01-09T00:00:00.000Z', '2026-01-20T00:00:00.000Z'),
      ],
      NOW,
    );
    expect(stats.expired).toBe(1);
    expect(stats.expiredShare).toBe(0.5);
  });

  it('ignores gists without an expiry when measuring lifetime', () => {
    const stats = computeLifetimeStats(
      [record('2026-01-01T00:00:00.000Z', null)],
      NOW,
    );
    expect(stats.withExpiry).toBe(0);
    expect(stats.averageSeconds).toBeNull();
    expect(stats.medianSeconds).toBeNull();
  });

  it('skips rows with an invalid created date', () => {
    const stats = computeLifetimeStats(
      [record('nonsense', '2026-01-02T00:00:00.000Z')],
      NOW,
    );
    expect(stats.withExpiry).toBe(0);
  });

  it('handles an empty response', () => {
    expect(computeLifetimeStats([], NOW)).toEqual({
      total: 0,
      withExpiry: 0,
      expired: 0,
      averageSeconds: null,
      medianSeconds: null,
      expiredShare: null,
    });
  });
});

describe('lifetimeCards', () => {
  it('formats each card with the shared formatters and a tooltip', () => {
    const cards = lifetimeCards(
      computeLifetimeStats([record('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')], NOW),
    );
    expect(cards.map((card) => card.key)).toEqual(['average', 'median', 'expiredShare']);
    expect(cards[0].value).toBe('1d 0h');
    expect(cards[2].value).toBe('100.0%');
    for (const card of cards) expect(card.tooltip.length).toBeGreaterThan(0);
  });

  it('shows the placeholder when there is no data', () => {
    const cards = lifetimeCards(computeLifetimeStats([], NOW));
    expect(cards[0].value).toBe('—');
    expect(cards[1].value).toBe('—');
    expect(cards[2].value).toBe('—');
  });
});
