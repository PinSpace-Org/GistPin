import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response shape returned by `GistsController.decorateGist` for single-gist
 * and list endpoints. Documents the fields that are not columns on the
 * `gists` table but are derived by the repository/controller (lat/lon from
 * the PostGIS geography, `gist_id`/`content_cid` aliases).
 */
export class GistResponseDto {
  @ApiProperty({ description: 'Gist UUID', example: '00000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ description: 'The gist content', example: 'Great coffee spot here!' })
  content: string;

  @ApiPropertyOptional({ description: 'H3 location cell', example: 's1t7d8c' })
  location_cell: string | null;

  @ApiPropertyOptional({ description: 'IPFS content CID', example: 'Qmrealcid' })
  content_hash: string | null;

  @ApiPropertyOptional({ description: 'On-chain gist ID from the GistRegistry contract' })
  stellar_gist_id: string | null;

  @ApiPropertyOptional({ description: 'Transaction hash of the on-chain post' })
  tx_hash: string | null;

  @ApiPropertyOptional({
    description: 'Stellar public key of the author (null for anonymous)',
  })
  author_address: string | null;

  @ApiProperty({ description: 'Whether the gist is active (exists, not expired, not hidden)' })
  is_active: boolean;

  @ApiProperty({ description: 'Number of reports filed against the gist', example: 0 })
  report_count: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Expiry timestamp' })
  expires_at: Date;

  @ApiProperty({ description: 'Latitude of the gist location', example: 9.0579 })
  lat: number;

  @ApiProperty({ description: 'Longitude of the gist location', example: 7.4951 })
  lon: number;

  @ApiProperty({ description: 'Alias of stellar_gist_id', example: 'gist-1' })
  gist_id: string;

  @ApiProperty({ description: 'Alias of content_hash', example: 'Qmrealcid' })
  content_cid: string;
}
