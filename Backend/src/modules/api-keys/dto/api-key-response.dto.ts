import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API key ID' })
  id: string;

  @ApiProperty({ description: 'Human-readable name' })
  name: string;

  @ApiProperty({ description: 'Owner Stellar address' })
  ownerAddress: string;

  @ApiProperty({ description: 'Assigned scopes' })
  scopes: string[];

  @ApiProperty({ description: 'Rate limit per minute' })
  rateLimitPerMin: number;

  @ApiProperty({ description: 'Raw API key (shown only once on creation)' })
  plainKey: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
