import { IsOptional, IsNumber, IsString, IsBoolean, IsEnum, Min, Max, IsLatitude, IsLongitude } from "class-validator"
import { Transform, Type } from "class-transformer"

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export enum SortBy {
  CREATED_AT = "createdAt",
  DISTANCE = "distance",
  LIKE_COUNT = "likeCount",
  VIEW_COUNT = "viewCount",
}

export class QueryStoriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  authorId?: string

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean = true

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC
}
