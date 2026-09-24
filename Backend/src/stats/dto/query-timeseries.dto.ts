import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601 } from 'class-validator';

export const TIMESERIES_BUCKETS = ['hour', 'day'] as const;
export type TimeseriesBucket = (typeof TIMESERIES_BUCKETS)[number];

export class QueryTimeseriesDto {
  @ApiProperty({ description: 'Range start (ISO 8601)' })
  @IsISO8601()
  from: string;

  @ApiProperty({ description: 'Range end (ISO 8601)' })
  @IsISO8601()
  to: string;

  @ApiProperty({ description: 'Bucket granularity', enum: TIMESERIES_BUCKETS })
  @IsIn(TIMESERIES_BUCKETS)
  bucket: TimeseriesBucket;
}
