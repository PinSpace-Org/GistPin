import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsStellarAddress } from '../../common/validators';

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
    description: 'Optional Stellar public key of the author (Ed25519, starts with G, 56 chars)',
    example: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  })
  @IsOptional()
  @IsStellarAddress()
  authorAddress?: string;

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
