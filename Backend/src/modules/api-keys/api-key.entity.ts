import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('api_keys')
@Index('idx_api_keys_owner_address')
@Index('idx_api_keys_key_hash', { unique: true })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  keyHash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 80 })
  ownerAddress: string;

  @Column({ type: 'jsonb', default: [] })
  scopes: string[];

  @Column({ type: 'int', default: 60 })
  rateLimitPerMin: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
