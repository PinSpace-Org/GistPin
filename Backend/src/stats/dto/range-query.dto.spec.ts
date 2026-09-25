import { BadRequestException } from '@nestjs/common';
import { RangeQueryDto } from './range-query.dto';

describe('RangeQueryDto.resolveRange', () => {
  it('defaults to the last 7 days when from/to are omitted', () => {
    const { from, to } = RangeQueryDto.resolveRange({});
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(7, 1);
  });

  it('rejects a range wider than 90 days', () => {
    expect(() =>
      RangeQueryDto.resolveRange({ from: '2020-01-01T00:00:00.000Z', to: '2020-06-01T00:00:00.000Z' }),
    ).toThrow(BadRequestException);
  });

  it('rejects from >= to', () => {
    expect(() =>
      RangeQueryDto.resolveRange({ from: '2026-01-02T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }),
    ).toThrow(BadRequestException);
  });

  it('accepts an explicit valid range', () => {
    const { from, to } = RangeQueryDto.resolveRange({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    });
    expect(from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });
});
