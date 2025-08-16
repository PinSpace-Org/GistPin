import type { GistType, CleanupStatus } from "../entities/expired-gist.entity"

export class QueryExpiredGistsDto {
  // @IsOptional()
  // @IsEnum(GistType)
  gistType?: GistType

  // @IsOptional()
  // @IsEnum(CleanupStatus)
  cleanupStatus?: CleanupStatus

  // @IsOptional()
  // @IsDateString()
  expirationDateFrom?: string

  // @IsOptional()
  // @IsDateString()
  expirationDateTo?: string

  // @IsOptional()
  // @IsDateString()
  cleanupDateFrom?: string

  // @IsOptional()
  // @IsDateString()
  cleanupDateTo?: string

  // @IsOptional()
  // @IsUUID()
  archivedBy?: string

  // @IsOptional()
  // @Type(() => Number)
  // @IsInt()
  // @Min(1)
  // @Max(100)
  limit?: number = 20

  // @IsOptional()
  // @Type(() => Number)
  // @IsInt()
  // @Min(0)
  offset?: number = 0
}
