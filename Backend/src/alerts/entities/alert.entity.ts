export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

export enum AlertCategory {
  TRAFFIC = "traffic",
  WEATHER = "weather",
  SAFETY = "safety",
  EVENT = "event",
  CONSTRUCTION = "construction",
  EMERGENCY = "emergency",
  COMMUNITY = "community",
  OTHER = "other",
}

// @Entity('alerts')
export class Alert {
  // @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column({ type: 'varchar', length: 200 })
  title: string

  // @Column({ type: 'text' })
  content: string

  // @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.INFO })
  severity: AlertSeverity

  // @Column({ type: 'enum', enum: AlertCategory, default: AlertCategory.OTHER })
  category: AlertCategory

  // @Column({ type: 'decimal', precision: 10, scale: 8 })
  // @Index()
  latitude: number

  // @Column({ type: 'decimal', precision: 11, scale: 8 })
  // @Index()
  longitude: number

  // @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  // @Index({ spatial: true })
  location: string

  // @Column({ type: 'int', default: 1000 })
  radiusMeters: number

  // @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date

  // @Column({ type: 'boolean', default: true })
  isActive: boolean

  // @Column({ type: 'boolean', default: false })
  isVerified: boolean

  // @Column({ type: 'varchar', length: 100, nullable: true })
  reporterIp: string

  // @Column({ type: 'int', default: 0 })
  viewCount: number

  // @Column({ type: 'int', default: 0 })
  confirmationCount: number

  // @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>

  // @CreateDateColumn()
  createdAt: Date

  // @UpdateDateColumn()
  updatedAt: Date
}
