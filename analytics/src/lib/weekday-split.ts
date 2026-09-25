export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKEND_DAYS = [0, 6] as const;
export const DAY_PREFERENCES = ['local', 'utc'] as const;

export type DayPreference = (typeof DAY_PREFERENCES)[number];

export interface DailyBucket {
  date: string;
  count: number | null | undefined;
}

export interface WeekdayWeekendSplit {
  weekdayTotal: number;
  weekendTotal: number;
  weekdayDays: number;
  weekendDays: number;
  weekdayAverage: number | null;
  weekendAverage: number | null;
  percentDifference: number | null;
}

export function dayOfWeek(
  iso: string | null | undefined,
  preference: DayPreference,
): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return preference === 'utc' ? parsed.getUTCDay() : parsed.getDay();
}

export function isWeekendDay(day: number): boolean {
  return (WEEKEND_DAYS as readonly number[]).includes(day);
}

export function average(total: number, days: number): number | null {
  if (days <= 0) return null;
  return total / days;
}

export function splitWeekdayWeekend(
  buckets: ReadonlyArray<DailyBucket>,
  preference: DayPreference,
): WeekdayWeekendSplit {
  let weekdayTotal = 0;
  let weekendTotal = 0;
  let weekdayDays = 0;
  let weekendDays = 0;

  for (const bucket of buckets) {
    const day = dayOfWeek(bucket?.date, preference);
    if (day === null) continue;
    const count =
      typeof bucket?.count === 'number' && !Number.isNaN(bucket.count) ? bucket.count : 0;
    if (isWeekendDay(day)) {
      weekendTotal += count;
      weekendDays += 1;
    } else {
      weekdayTotal += count;
      weekdayDays += 1;
    }
  }

  const weekdayAverage = average(weekdayTotal, weekdayDays);
  const weekendAverage = average(weekendTotal, weekendDays);

  return {
    weekdayTotal,
    weekendTotal,
    weekdayDays,
    weekendDays,
    weekdayAverage,
    weekendAverage,
    percentDifference:
      weekdayAverage === null || weekdayAverage === 0
        ? null
        : ((weekendAverage ?? 0) - weekdayAverage) / weekdayAverage,
  };
}
