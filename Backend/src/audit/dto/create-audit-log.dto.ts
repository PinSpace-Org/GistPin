import { type AuditAction, AuditLevel, type EntityType } from "../entities/audit-log.entity"

export class CreateAuditLogDto {
  // @IsEnum(AuditAction)
  action: AuditAction

  // @IsEnum(AuditLevel)
  // @IsOptional()
  level?: AuditLevel = AuditLevel.INFO

  // @IsEnum(EntityType)
  entityType: EntityType

  // @IsOptional()
  // @IsUUID()
  entityId?: string

  // @IsOptional()
  // @IsUUID()
  userId?: string

  // @IsOptional()
  // @IsString()
  sessionId?: string

  // @IsOptional()
  // @IsIP()
  ipAddress?: string

  // @IsOptional()
  // @IsString()
  userAgent?: string

  // @IsOptional()
  // @IsNumber()
  latitude?: number

  // @IsOptional()
  // @IsNumber()
  longitude?: number

  // @IsOptional()
  // @IsString()
  location?: string

  // @IsString()
  description: string

  // @IsOptional()
  // @IsObject()
  metadata?: Record<string, any>

  // @IsOptional()
  // @IsObject()
  oldValues?: Record<string, any>

  // @IsOptional()
  // @IsObject()
  newValues?: Record<string, any>

  // @IsOptional()
  // @IsNumber()
  duration?: number

  // @IsOptional()
  // @IsBoolean()
  isError?: boolean

  // @IsOptional()
  // @IsString()
  errorMessage?: string

  // @IsOptional()
  // @IsString()
  stackTrace?: string

  // @IsOptional()
  expiresAt?: Date
}
