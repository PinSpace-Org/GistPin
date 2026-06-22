import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('gists')
@Index('idx_gists_location_cell')
@Index('idx_gists_author_address')
@Index('idx_gists_location_geography', { synchronize: false })
export class Gist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  location_cell: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  content_hash: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  stellar_gist_id: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  tx_hash: string | null;

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

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz' })
  expires_at: Date;
}
