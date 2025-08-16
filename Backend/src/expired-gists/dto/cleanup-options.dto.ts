import type { GistType } from "../entities/expired-gist.entity"

export class CleanupOptionsDto {
  // @IsOptional()
  // @IsEnum(GistType)
  gistType?: GistType

  // @IsOptional()
  // @Type(() => Number)
  // @IsInt()
  // @Min(1)
  olderThanDays?: number

  // @IsOptional()
  // @IsBoolean()
  dryRun?: boolean = true

  // @IsOptional()
  // @Type(() => Number)
  // @IsInt()
  // @Min(1)
  batchSize?: number = 100

  // @IsOptional()
  // @IsBoolean()
  archiveBeforeDelete?: boolean = true

  // @IsOptional()
  // @IsString()
  reason?: string
}

export class RecoverGistDto {
  // @IsString()
  originalId: string

  // @IsEnum(GistType)
  gistType: GistType

  // @IsOptional()
  // @IsString()
  reason?: string
}
