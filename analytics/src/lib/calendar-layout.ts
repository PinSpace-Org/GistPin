export const MAX_CALENDAR_DAYS = 90;
export const HEAT_LEVEL_MAX = 4;

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  count: number;
  inRange: boolean;
  heatLevel: number;
}

export type CalendarWeek = CalendarDay[];

const DAY_MS = 86_400_000;

function parseDay(iso: string | null | undefined): Date | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function toCalendarDayKey(iso: string | null | undefined): string | null {
  const day = parseDay(iso);
  return day === null ? null : toDayKey(day);
}

export function heatLevel(
  count: number | null | undefined,
  max: number | null | undefined,
): number {
  if (typeof count !== 'number' || Number.isNaN(count) || count <= 0) return 0;
  if (typeof max !== 'number' || Number.isNaN(max) || max <= 0) return 0;
  if (count >= max) return HEAT_LEVEL_MAX;
  return Math.min(HEAT_LEVEL_MAX, Math.max(1, Math.ceil((count / max) * HEAT_LEVEL_MAX)));
}

export function buildCalendarWeeks(
  startIso: string,
  endIso: string,
  counts: Readonly<Record<string, number>> = {},
): CalendarWeek[] {
  const rawStart = parseDay(startIso);
  const rawEnd = parseDay(endIso);
  if (rawStart === null || rawEnd === null) return [];
  if (rawEnd.getTime() < rawStart.getTime()) return [];

  const end = rawEnd;
  const spanDays = Math.round((end.getTime() - rawStart.getTime()) / DAY_MS) + 1;
  const start = spanDays > MAX_CALENDAR_DAYS ? addDays(end, -(MAX_CALENDAR_DAYS - 1)) : rawStart;

  const max = Object.values(counts).reduce(
    (highest, value) =>
      typeof value === 'number' && !Number.isNaN(value) && value > highest ? value : highest,
    0,
  );

  const gridStart = addDays(start, -start.getUTCDay());
  const gridEnd = addDays(end, 6 - end.getUTCDay());

  const cells: CalendarDay[] = [];
  for (let cursor = gridStart; cursor.getTime() <= gridEnd.getTime(); cursor = addDays(cursor, 1)) {
    const date = toDayKey(cursor);
    const inRange = cursor.getTime() >= start.getTime() && cursor.getTime() <= end.getTime();
    const count = inRange && typeof counts[date] === 'number' ? counts[date] : 0;
    cells.push({
      date,
      dayOfMonth: cursor.getUTCDate(),
      count,
      inRange,
      heatLevel: inRange ? heatLevel(count, max) : 0,
    });
  }

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
