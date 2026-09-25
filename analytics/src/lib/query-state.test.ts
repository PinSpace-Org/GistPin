import { describe, it, expect } from 'vitest';
import { parseParam, serializeParam } from './query-state';

describe('parseParam', () => {
  it('parses a string param', () => {
    expect(parseParam('hello', { type: 'string', defaultValue: 'default' })).toBe('hello');
  });

  it('parses a number param', () => {
    expect(parseParam('42', { type: 'number', defaultValue: 0 })).toBe(42);
  });

  it('falls back to default for an invalid number', () => {
    expect(parseParam('not-a-number', { type: 'number', defaultValue: 7 })).toBe(7);
  });

  it('parses a valid date param as its raw ISO string', () => {
    const iso = '2026-01-01T00:00:00.000Z';
    expect(parseParam(iso, { type: 'date', defaultValue: '2020-01-01T00:00:00.000Z' })).toBe(iso);
  });

  it('falls back to default for an invalid date', () => {
    expect(
      parseParam('nonsense', { type: 'date', defaultValue: '2020-01-01T00:00:00.000Z' }),
    ).toBe('2020-01-01T00:00:00.000Z');
  });

  it('parses a valid enum value', () => {
    expect(
      parseParam('day', { type: 'enum', values: ['hour', 'day', 'week'] as const, defaultValue: 'day' }),
    ).toBe('day');
  });

  it('falls back to default for an enum value not in the allowed set', () => {
    expect(
      parseParam('month', { type: 'enum', values: ['hour', 'day', 'week'] as const, defaultValue: 'day' }),
    ).toBe('day');
  });

  it('falls back to default when the param is missing', () => {
    expect(parseParam(null, { type: 'string', defaultValue: 'default' })).toBe('default');
  });

  it('falls back to default when the param is an empty string', () => {
    expect(parseParam('', { type: 'number', defaultValue: 5 })).toBe(5);
  });
});

describe('serializeParam', () => {
  it('serializes a string', () => {
    expect(serializeParam('hello', { type: 'string', defaultValue: '' })).toBe('hello');
  });

  it('serializes a number', () => {
    expect(serializeParam(42, { type: 'number', defaultValue: 0 })).toBe('42');
  });

  it('serializes an enum value', () => {
    expect(
      serializeParam('week', { type: 'enum', values: ['hour', 'day', 'week'] as const, defaultValue: 'day' }),
    ).toBe('week');
  });
});
