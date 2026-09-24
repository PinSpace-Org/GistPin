/**
 * Formatting helpers shared by every chart/table in the analytics app.
 * Every helper accepts null/undefined/NaN input and returns a safe
 * placeholder ('—') instead of throwing or rendering "NaN"/"Invalid Date".
 */

const PLACEHOLDER = '—'; // em dash

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/** e.g. 1234 -> "1.2K", 1_500_000 -> "1.5M". */
export function formatCompactNumber(value: number | null | undefined, locale = 'en-US'): string {
  if (isBlank(value)) return PLACEHOLDER;
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value as number,
  );
}

/** `fraction` is 0-1; e.g. 0.256 -> "25.6%". */
export function formatPercent(
  fraction: number | null | undefined,
  locale = 'en-US',
  fractionDigits = 1,
): string {
  if (isBlank(fraction)) return PLACEHOLDER;
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction as number);
}

/** `totalSeconds` -> a compact "1d 2h", "3h 15m", "45m", or "30s" string. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (isBlank(totalSeconds) || (totalSeconds as number) < 0) return PLACEHOLDER;

  const seconds = Math.floor(totalSeconds as number);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** e.g. "5 minutes ago", "in 2 hours". */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  now: Date = new Date(),
  locale = 'en-US',
): string {
  if (isBlank(date)) return PLACEHOLDER;
  const target = typeof date === 'string' ? new Date(date) : (date as Date);
  if (Number.isNaN(target.getTime())) return PLACEHOLDER;

  const diffSeconds = (target.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  for (const [unit, secondsInUnit] of units) {
    const value = diffSeconds / secondsInUnit;
    if (Math.abs(value) >= 1 || unit === 'second') {
      return rtf.format(Math.round(value), unit);
    }
  }
  return rtf.format(0, 'second');
}

/** ISO 8601 string -> the viewer's local date/time. */
export function formatIsoToLocal(iso: string | null | undefined, locale = 'en-US'): string {
  if (isBlank(iso)) return PLACEHOLDER;
  const date = new Date(iso as string);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** ISO 8601 string -> UTC date/time, explicitly labelled. */
export function formatIsoToUtc(iso: string | null | undefined, locale = 'en-US'): string {
  if (isBlank(iso)) return PLACEHOLDER;
  const date = new Date(iso as string);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`;
}

/** e.g. "GABCDEFGHIJKLMNOP...WXYZ" -> "GABCDE…WXYZ". */
export function truncateAddress(
  address: string | null | undefined,
  prefixLength = 6,
  suffixLength = 4,
): string {
  if (isBlank(address) || (address as string).length === 0) return PLACEHOLDER;
  const value = address as string;
  if (value.length <= prefixLength + suffixLength) return value;
  return `${value.slice(0, prefixLength)}…${value.slice(-suffixLength)}`;
}
