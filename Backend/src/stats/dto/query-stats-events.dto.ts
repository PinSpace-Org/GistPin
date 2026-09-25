import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export const STATS_BUCKETS = ['hour', 'day'] as const;
export type StatsBucket = (typeof STATS_BUCKETS)[number];

export class QueryStatsEventsDto {
  @ApiProperty({ description: 'Range start (ISO 8601)' })
  @IsISO8601()
  from: string;

  @ApiProperty({ description: 'Range end (ISO 8601)' })
  @IsISO8601()
  to: string;

  @ApiProperty({ description: 'Bucket granularity', enum: STATS_BUCKETS })
  @IsIn(STATS_BUCKETS)
  bucket: StatsBucket;

  @ApiPropertyOptional({ description: 'Filter to a single event type' })
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Max recent events to return (1-100)', default: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  recentLimit?: number = 20;
}
