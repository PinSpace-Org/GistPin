export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  VIEW = "VIEW",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LIKE = "LIKE",
  UNLIKE = "UNLIKE",
  REPORT = "REPORT",
  MODERATE = "MODERATE",
}

export enum AuditLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

export enum EntityType {
  STORY = "STORY",
  ALERT = "ALERT",
  USER = "USER",
  SYSTEM = "SYSTEM",
}

// @Entity('audit_logs')
export class AuditLog {
  // @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column({ type: 'enum', enum: AuditAction })
  // @Index()
  action: AuditAction

  // @Column({ type: 'enum', enum: AuditLevel, default: AuditLevel.INFO })
  // @Index()
  level: AuditLevel

  // @Column({ type: 'enum', enum: EntityType })
  // @Index()
  entityType: EntityType

  // @Column({ nullable: true })
  // @Index()
  entityId: string

  // @Column({ nullable: true })
  // @Index()
  userId: string

  // @Column({ nullable: true })
  sessionId: string

  // @Column({ nullable: true })
  ipAddress: string

  // @Column({ nullable: true })
  userAgent: string

  // @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number

  // @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number

  // @Column({ nullable: true })
  location: string

  // @Column()
  description: string

  // @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  // @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>

  // @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>

  // @Column({ nullable: true })
  duration: number // in milliseconds

  // @Column({ default: false })
  // @Index()
  isError: boolean

  // @Column({ nullable: true })
  errorMessage: string

  // @Column({ nullable: true })
  stackTrace: string

  // @CreateDateColumn()
  // @Index()
  createdAt: Date

  // @Column({ type: 'timestamp', nullable: true })
  // @Index()
  expiresAt: Date
}
