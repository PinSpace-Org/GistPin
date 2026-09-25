import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIME_PREFERENCE,
  TIME_PREFERENCES,
  formatTimestampInPreference,
  isTimePreference,
  parseTimePreference,
  serializeTimePreference,
  timePreferenceLabel,
} from './time-preference';

describe('time preference parsing', () => {
  it('exposes both preferences', () => {
    expect(TIME_PREFERENCES).toEqual(['local', 'utc']);
  });

  it('narrows valid values', () => {
    expect(isTimePreference('utc')).toBe(true);
    expect(isTimePreference('local')).toBe(true);
    expect(isTimePreference('UTC')).toBe(false);
    expect(isTimePreference(7)).toBe(false);
  });

  it('parses valid values and falls back otherwise', () => {
    expect(parseTimePreference('utc')).toBe('utc');
    expect(parseTimePreference('local')).toBe('local');
    expect(parseTimePreference('other')).toBe(DEFAULT_TIME_PREFERENCE);
    expect(parseTimePreference(null)).toBe(DEFAULT_TIME_PREFERENCE);
    expect(parseTimePreference(undefined)).toBe(DEFAULT_TIME_PREFERENCE);
  });

  it('round-trips through serialize', () => {
    expect(parseTimePreference(serializeTimePreference('utc'))).toBe('utc');
  });
});

describe('timePreferenceLabel', () => {
  it('labels each option for the header toggle', () => {
    expect(timePreferenceLabel('utc')).toBe('UTC');
    expect(timePreferenceLabel('local')).toBe('Local time');
  });
});

describe('formatTimestampInPreference', () => {
  it('formats in UTC when requested', () => {
    expect(formatTimestampInPreference('2026-01-01T12:00:00.000Z', 'utc')).toContain('UTC');
  });

  it('formats in local time when requested', () => {
    expect(formatTimestampInPreference('2026-01-01T12:00:00.000Z', 'local')).not.toContain('UTC');
  });

  it('passes blanks through the shared formatter', () => {
    expect(formatTimestampInPreference(null, 'utc')).toBe('—');
    expect(formatTimestampInPreference(undefined, 'local')).toBe('—');
    expect(formatTimestampInPreference('nonsense', 'utc')).toBe('—');
  });
});
