import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export const RANGE_BUCKETS = ['hour', 'day', 'week'] as const;
export type RangeBucket = (typeof RANGE_BUCKETS)[number];

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export class RangeQueryDto {
  @ApiPropertyOptional({ description: 'Range start (ISO 8601). Defaults to 7 days before `to`.' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Range end (ISO 8601). Defaults to now.' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Bucket granularity', enum: RANGE_BUCKETS, default: 'day' })
  @IsOptional()
  @IsIn(RANGE_BUCKETS)
  bucket?: RangeBucket = 'day';

  /**
   * Resolves `from`/`to` into concrete `Date`s, applying the "last 7
   * days" default and rejecting a range wider than `MAX_RANGE_DAYS`.
   */
  static resolveRange(dto: Pick<RangeQueryDto, 'from' | 'to'>): { from: Date; to: Date } {
    const to = dto.to ? new Date(dto.to) : new Date();
    const from = dto.from ? new Date(dto.from) : new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('`from` must be a valid ISO date before `to`');
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Range too large: maximum is ${MAX_RANGE_DAYS} days`);
    }

    return { from, to };
  }
}
