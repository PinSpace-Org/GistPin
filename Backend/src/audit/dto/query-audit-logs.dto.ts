import type { AuditAction, AuditLevel, EntityType } from "../entities/audit-log.entity"

export class QueryAuditLogsDto {
  // @IsOptional()
  // @IsEnum(AuditAction)
  action?: AuditAction

  // @IsOptional()
  // @IsEnum(AuditLevel)
  level?: AuditLevel

  // @IsOptional()
  // @IsEnum(EntityType)
  entityType?: EntityType

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
  // @IsString()
  ipAddress?: string

  // @IsOptional()
  // @IsDateString()
  startDate?: string

  // @IsOptional()
  // @IsDateString()
  endDate?: string

  // @IsOptional()
  // @IsBoolean()
  // @Type(() => Boolean)
  isError?: boolean

  // @IsOptional()
  // @IsString()
  search?: string

  // @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  latitude?: number

  // @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  longitude?: number

  // @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  radius?: number = 1000 // meters

  // @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  page?: number = 1

  // @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  limit?: number = 50

  // @IsOptional()
  // @IsString()
  sortBy?: string = "createdAt"

  // @IsOptional()
  // @IsEnum(['ASC', 'DESC'])
  sortOrder?: "ASC" | "DESC" = "DESC"
}
