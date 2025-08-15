import type { TipCategory, TipStatus } from "../entities/tip.entity"

export class QueryTipsDto {
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(1)
  page?: number = 1

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(1)
  // @Max(100)
  limit?: number = 20

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(-90)
  // @Max(90)
  latitude?: number

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(-180)
  // @Max(180)
  longitude?: number

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(0.1)
  // @Max(100)
  radius?: number = 5 // Default 5km radius

  // @IsOptional()
  // @IsEnum(TipCategory)
  category?: TipCategory

  // @IsOptional()
  // @IsEnum(TipStatus)
  status?: TipStatus

  // @IsOptional()
  // @IsString()
  search?: string

  // @IsOptional()
  // @IsString()
  city?: string

  // @IsOptional()
  // @IsString()
  country?: string

  // @IsOptional()
  // @IsString()
  tags?: string

  // @IsOptional()
  // @IsBoolean()
  // @Type(() => Boolean)
  includeExpired?: boolean = false

  // @IsOptional()
  // @IsString()
  sortBy?: string = "createdAt"

  // @IsOptional()
  // @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC"

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(0)
  minHelpfulnessRating?: number
}
