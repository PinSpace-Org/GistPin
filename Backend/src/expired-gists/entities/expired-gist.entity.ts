export enum GistType {
  STORY = "story",
  ALERT = "alert",
  TIP = "tip",
}

export enum CleanupStatus {
  PENDING = "pending",
  ARCHIVED = "archived",
  DELETED = "deleted",
  RECOVERED = "recovered",
}

// @Entity('expired_gists')
// @Index(['gistType', 'originalId'])
// @Index(['expirationDate'])
// @Index(['cleanupStatus'])
export class ExpiredGist {
  // @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column({ type: 'enum', enum: GistType })
  gistType: GistType

  // @Column({ name: 'original_id' })
  originalId: string

  // @Column({ type: 'jsonb' })
  originalData: any

  // @Column({ name: 'expiration_date', type: 'timestamp' })
  expirationDate: Date

  // @Column({ name: 'cleanup_date', type: 'timestamp', nullable: true })
  cleanupDate: Date

  // @Column({ type: 'enum', enum: CleanupStatus, default: CleanupStatus.PENDING })
  cleanupStatus: CleanupStatus

  // @Column({ name: 'retention_days', type: 'integer', default: 30 })
  retentionDays: number

  // @Column({ type: 'text', nullable: true })
  reason: string

  // @Column({ name: 'archived_by', nullable: true })
  archivedBy: string

  // @Column({ name: 'recovered_by', nullable: true })
  recoveredBy: string

  // @Column({ name: 'recovery_date', type: 'timestamp', nullable: true })
  recoveryDate: Date

  // @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
