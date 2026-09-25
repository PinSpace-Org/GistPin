import { formatIsoToLocal, formatIsoToUtc } from './format';

export const TIME_PREFERENCE_STORAGE_KEY = 'gistpin:analytics:time-preference';
export const TIME_PREFERENCE_URL_KEY = 'tz';

export const TIME_PREFERENCES = ['local', 'utc'] as const;
export type TimePreference = typeof TIME_PREFERENCES[number];

export const DEFAULT_TIME_PREFERENCE: TimePreference = 'local';

export function isTimePreference(value: unknown): value is TimePreference {
  return typeof value === 'string' && (TIME_PREFERENCES as readonly string[]).includes(value);
}

export function parseTimePreference(raw: string | null | undefined): TimePreference {
  return isTimePreference(raw) ? raw : DEFAULT_TIME_PREFERENCE;
}

export function serializeTimePreference(preference: TimePreference): string {
  return preference;
}

export function timePreferenceLabel(preference: TimePreference): string {
  return preference === 'utc' ? 'UTC' : 'Local time';
}

export function formatTimestampInPreference(
  iso: string | null | undefined,
  preference: TimePreference,
  locale = 'en-US',
): string {
  return preference === 'utc' ? formatIsoToUtc(iso, locale) : formatIsoToLocal(iso, locale);
}
