import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsString, MaxLength, IsOptional } from 'class-validator';
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
}
