import { IsNumber, IsOptional, IsString, IsBoolean, Min, Max, IsIn } from "class-validator"
import { Transform, Type } from "class-transformer"

export class QueryGistsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => Number.parseFloat(value))
  latitude: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => Number.parseFloat(value))
  longitude: number

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50) // Max 50km radius
  @Transform(({ value }) => Number.parseFloat(value))
  radius?: number = 1 // Default 1km radius

  @IsOptional()
  @IsString()
  @IsIn(["tip", "alert", "story", "question", "event", "other"])
  type?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number = 0

  @IsOptional()
  @IsString()
  @IsIn(["distance", "createdAt", "likeCount", "viewCount"])
  sortBy?: string = "distance"

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "ASC"

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  includeExpired?: boolean = false
}
