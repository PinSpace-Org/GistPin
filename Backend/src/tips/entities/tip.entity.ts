// Enum for tip categories
export enum TipCategory {
  RESTAURANT = "restaurant",
  SHOPPING = "shopping",
  TRANSPORTATION = "transportation",
  ENTERTAINMENT = "entertainment",
  SERVICES = "services",
  EVENTS = "events",
  SAFETY = "safety",
  GENERAL = "general",
}

// Enum for tip status
export enum TipStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REPORTED = "reported",
  HIDDEN = "hidden",
}

// @Entity('tips')
export class Tip {
  // @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column({ type: 'text' })
  content: string

  // @Column({ type: 'varchar', length: 255, nullable: true })
  title: string

  // @Column({
  //   type: 'enum',
  //   enum: TipCategory,
  //   default: TipCategory.GENERAL,
  // })
  category: TipCategory

  // @Column({
  //   type: 'enum',
  //   enum: TipStatus,
  //   default: TipStatus.ACTIVE,
  // })
  status: TipStatus

  // Location fields using PostGIS
  // @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number

  // @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number

  // @Index({ spatial: true })
  // @Column({
  //   type: 'geography',
  //   spatialFeatureType: 'Point',
  //   srid: 4326,
  //   nullable: true,
  // })
  location: string

  // @Column({ type: 'varchar', length: 255, nullable: true })
  address: string

  // @Column({ type: 'varchar', length: 100, nullable: true })
  city: string

  // @Column({ type: 'varchar', length: 100, nullable: true })
  country: string

  // Interaction tracking
  // @Column({ type: 'int', default: 0 })
  viewCount: number

  // @Column({ type: 'int', default: 0 })
  helpfulCount: number

  // @Column({ type: 'int', default: 0 })
  notHelpfulCount: number

  // @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  helpfulnessRating: number

  // Anonymous posting support
  // @Column({ type: 'uuid', nullable: true })
  authorId: string

  // @Column({ type: 'varchar', length: 50, nullable: true })
  authorNickname: string

  // @Column({ type: 'boolean', default: true })
  isAnonymous: boolean

  // Expiration and scheduling
  // @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date

  // @Column({ type: 'boolean', default: false })
  isExpired: boolean

  // Metadata
  // @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>

  // @Column({ type: 'varchar', length: 255, nullable: true })
  tags: string

  // @Column({ type: 'inet', nullable: true })
  ipAddress: string

  // @Column({ type: 'text', nullable: true })
  userAgent: string

  // @CreateDateColumn()
  createdAt: Date

  // @UpdateDateColumn()
  updatedAt: Date

  // @DeleteDateColumn()
  deletedAt: Date
}
