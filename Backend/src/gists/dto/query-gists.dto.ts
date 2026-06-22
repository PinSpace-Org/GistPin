import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryGistsDto {
  @ApiProperty({ description: 'Latitude to search from', example: 9.0579 })
  @IsLatitude()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'Longitude to search from', example: 7.4951 })
  @IsLongitude()
  @Type(() => Number)
  lon: number;

  @ApiPropertyOptional({
    description: 'Search radius in metres (50–5000)',
    example: 500,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(5000)
  @Type(() => Number)
  radius?: number = 500;

  @ApiPropertyOptional({ description: 'Max results to return (1–100)', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (ISO date string of last seen created_at)',
    example: '2026-03-25T04:34:31.334Z',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description:
      'Filter by Stellar address of the author. Case-sensitive exact match against `author_address`.',
    example: 'GABC...XYZ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorAddress?: string;

  @ApiPropertyOptional({
    description: 'When true, count endpoint returns breakdown by location_cell',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  breakdown?: boolean;
}
