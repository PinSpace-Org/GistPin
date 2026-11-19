import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('gists')
@Index('idx_gists_location_cell')
@Index('idx_gists_author_address')
@Index('idx_gists_location_geography', { synchronize: false })
export class Gist {
  @ApiProperty({ description: 'Gist UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Gist content' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: 'Geohash-like cell the gist was indexed under', nullable: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  location_cell: string | null;

  @ApiProperty({ description: 'IPFS content hash/CID', nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  content_hash: string | null;

  @ApiProperty({ description: 'On-chain gist identifier', nullable: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  stellar_gist_id: string | null;

  @ApiProperty({ description: 'Stellar transaction hash that created the gist', nullable: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  tx_hash: string | null;

  @ApiProperty({ description: 'Author Stellar address, null if anonymous', nullable: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  author_address: string | null;

  /**
   * PostGIS geography(Point, 4326) column.
   * TypeORM has no native geography type — the real column is created
   * via migration. This text placeholder keeps TypeORM happy while
   * GistRepository handles all spatial reads/writes via raw SQL.
   */
  @Column({ type: 'text', nullable: true, select: false })
  location: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Expiry timestamp' })
  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @ApiProperty({ description: 'Whether the gist has been hidden by a moderator' })
  @Column({ type: 'boolean', default: false })
  hidden: boolean;

  @ApiProperty({ description: 'Number of times the gist has been reported' })
  @Column({ type: 'integer', default: 0 })
  report_count: number;

  @ApiProperty({ description: 'Whether the gist is currently active' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
