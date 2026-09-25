import { describe, it, expect } from 'vitest';
import {
  HEAT_LEVEL_MAX,
  MAX_CALENDAR_DAYS,
  buildCalendarWeeks,
  heatLevel,
  toCalendarDayKey,
} from './calendar-layout';

function inRangeDates(start: string, end: string): string[] {
  return buildCalendarWeeks(start, end)
    .flat()
    .filter((day) => day.inRange)
    .map((day) => day.date);
}

describe('toCalendarDayKey', () => {
  it('normalises an ISO timestamp to a day key', () => {
    expect(toCalendarDayKey('2026-01-05T23:59:59.000Z')).toBe('2026-01-05');
  });

  it('returns null for blanks and invalid dates', () => {
    expect(toCalendarDayKey(null)).toBeNull();
    expect(toCalendarDayKey('')).toBeNull();
    expect(toCalendarDayKey('nonsense')).toBeNull();
  });
});

describe('heatLevel', () => {
  it('returns 0 for no activity', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(null, 10)).toBe(0);
    expect(heatLevel(Number.NaN, 10)).toBe(0);
  });

  it('scales activity up to the maximum level', () => {
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(3, 10)).toBe(2);
    expect(heatLevel(8, 10)).toBe(4);
    expect(heatLevel(25, 10)).toBe(HEAT_LEVEL_MAX);
  });

  it('degrades safely without a maximum', () => {
    expect(heatLevel(5, 0)).toBe(0);
    expect(heatLevel(5, null)).toBe(0);
  });
});

describe('buildCalendarWeeks', () => {
  it('lays out rows of seven cells starting on Sunday', () => {
    const weeks = buildCalendarWeeks('2026-01-05', '2026-01-11');
    expect(weeks.length).toBeGreaterThanOrEqual(1);
    for (const week of weeks) expect(week).toHaveLength(7);
    expect(weeks[0][0].date).toBe('2026-01-04');
  });

  it('pads leading and trailing days outside the range', () => {
    const weeks = buildCalendarWeeks('2026-01-05', '2026-01-11');
    expect(weeks[0][0].inRange).toBe(false);
    expect(weeks[0][0].heatLevel).toBe(0);
    const lastCell = weeks[weeks.length - 1][6];
    expect(lastCell.inRange).toBe(false);
  });

  it('handles a range shorter than a week', () => {
    expect(inRangeDates('2026-01-05', '2026-01-07')).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
    ]);
  });

  it('colours in-range days from the supplied counts', () => {
    const weeks = buildCalendarWeeks('2026-01-05', '2026-01-11', {
      '2026-01-05': 4,
      '2026-01-06': 0,
    });
    const byDate = new Map(weeks.flat().map((day) => [day.date, day]));
    expect(byDate.get('2026-01-05')?.count).toBe(4);
    expect(byDate.get('2026-01-05')?.heatLevel).toBe(HEAT_LEVEL_MAX);
    expect(byDate.get('2026-01-06')?.heatLevel).toBe(0);
  });

  it('caps the grid at 90 days, keeping the most recent days', () => {
    const dates = inRangeDates('2025-01-01', '2026-01-01');
    expect(dates).toHaveLength(MAX_CALENDAR_DAYS);
    expect(dates[0]).toBe('2025-10-04');
    expect(dates[dates.length - 1]).toBe('2026-01-01');
  });

  it('keeps every day when the range is exactly the maximum', () => {
    expect(inRangeDates('2025-10-04', '2026-01-01')).toHaveLength(MAX_CALENDAR_DAYS);
  });

  it('returns no rows for invalid or reversed ranges', () => {
    expect(buildCalendarWeeks('nonsense', '2026-01-01')).toEqual([]);
    expect(buildCalendarWeeks('2026-01-11', '2026-01-05')).toEqual([]);
  });

  it('handles a single-day range', () => {
    expect(inRangeDates('2026-01-05', '2026-01-05')).toEqual(['2026-01-05']);
  });
});
