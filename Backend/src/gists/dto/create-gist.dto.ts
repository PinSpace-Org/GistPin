import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsString, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateGistDto {
  @ApiProperty({
    description: 'The gist content (max 280 characters)',
    example: 'Great coffee spot here!',
    maxLength: 280,
  })
  @IsString()
  @MaxLength(280)
  content: string;

  @ApiProperty({ description: 'Latitude of the gist location', example: 9.0579 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ description: 'Longitude of the gist location', example: 7.4951 })
  @IsLongitude()
  lon: number;

  @ApiPropertyOptional({
    description: 'Optional Stellar address of the author',
    example: 'GABC...XYZ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  author?: string;

  @ApiPropertyOptional({
    description: 'Time-to-live in hours (default: 24, max: 168)',
    example: 24,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  ttlHours?: number;
}
