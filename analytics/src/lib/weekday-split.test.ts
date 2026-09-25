import { describe, it, expect } from 'vitest';
import {
  WEEKDAY_LABELS,
  average,
  dayOfWeek,
  isWeekendDay,
  splitWeekdayWeekend,
} from './weekday-split';

const RANGE = [
  { date: '2026-01-05T00:00:00.000Z', count: 10 },
  { date: '2026-01-06T00:00:00.000Z', count: 10 },
  { date: '2026-01-07T00:00:00.000Z', count: 10 },
  { date: '2026-01-08T00:00:00.000Z', count: 10 },
  { date: '2026-01-09T00:00:00.000Z', count: 10 },
  { date: '2026-01-10T00:00:00.000Z', count: 30 },
  { date: '2026-01-11T00:00:00.000Z', count: 30 },
];

describe('weekday labels', () => {
  it('starts the week on Sunday', () => {
    expect(WEEKDAY_LABELS[0]).toBe('Sun');
    expect(WEEKDAY_LABELS).toHaveLength(7);
  });
});

describe('dayOfWeek', () => {
  it('uses UTC day numbering when preferred', () => {
    expect(dayOfWeek('2026-01-10T00:00:00.000Z', 'utc')).toBe(6);
    expect(dayOfWeek('2026-01-11T00:00:00.000Z', 'utc')).toBe(0);
  });

  it('returns null for invalid input', () => {
    expect(dayOfWeek('nonsense', 'utc')).toBeNull();
    expect(dayOfWeek(null, 'utc')).toBeNull();
    expect(dayOfWeek(undefined, 'local')).toBeNull();
  });
});

describe('isWeekendDay', () => {
  it('treats Saturday and Sunday as weekend', () => {
    expect(isWeekendDay(0)).toBe(true);
    expect(isWeekendDay(6)).toBe(true);
    expect(isWeekendDay(1)).toBe(false);
  });
});

describe('average', () => {
  it('returns null when there are no days', () => {
    expect(average(10, 0)).toBeNull();
    expect(average(10, 3)).toBeCloseTo(3.3333, 3);
  });
});

describe('splitWeekdayWeekend', () => {
  it('splits totals and day counts', () => {
    const split = splitWeekdayWeekend(RANGE, 'utc');
    expect(split.weekdayTotal).toBe(50);
    expect(split.weekendTotal).toBe(60);
    expect(split.weekdayDays).toBe(5);
    expect(split.weekendDays).toBe(2);
  });

  it('computes averages per day, not per total', () => {
    const split = splitWeekdayWeekend(RANGE, 'utc');
    expect(split.weekdayAverage).toBeCloseTo(10);
    expect(split.weekendAverage).toBeCloseTo(30);
  });

  it('reports weekends 200% busier', () => {
    expect(splitWeekdayWeekend(RANGE, 'utc').percentDifference).toBeCloseTo(2);
  });

  it('treats blank counts as zero', () => {
    const split = splitWeekdayWeekend(
      [
        { date: '2026-01-05T00:00:00.000Z', count: null },
        { date: '2026-01-10T00:00:00.000Z', count: undefined },
      ],
      'utc',
    );
    expect(split.weekdayTotal).toBe(0);
    expect(split.weekendTotal).toBe(0);
  });

  it('returns a null difference when there is no weekday activity', () => {
    const split = splitWeekdayWeekend([{ date: '2026-01-10T00:00:00.000Z', count: 5 }], 'utc');
    expect(split.weekdayAverage).toBe(0);
    expect(split.percentDifference).toBeNull();
  });

  it('skips invalid dates', () => {
    const split = splitWeekdayWeekend([{ date: 'nope', count: 5 }], 'utc');
    expect(split.weekdayDays).toBe(0);
    expect(split.weekendDays).toBe(0);
  });

  it('handles an empty range', () => {
    expect(splitWeekdayWeekend([], 'utc')).toEqual({
      weekdayTotal: 0,
      weekendTotal: 0,
      weekdayDays: 0,
      weekendDays: 0,
      weekdayAverage: null,
      weekendAverage: null,
      percentDifference: null,
    });
  });
});
