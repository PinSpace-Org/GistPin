// import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
// import { Type } from 'class-transformer';
import type { AlertSeverity, AlertCategory } from "../entities/alert.entity"

export class QueryAlertsDto {
  // @IsOptional()
  // @IsNumber()
  // @Min(-90)
  // @Max(90)
  // @Type(() => Number)
  latitude?: number

  // @IsOptional()
  // @IsNumber()
  // @Min(-180)
  // @Max(180)
  // @Type(() => Number)
  longitude?: number

  // @IsOptional()
  // @IsNumber()
  // @Min(10)
  // @Max(50000)
  // @Type(() => Number)
  radiusKm?: number

  // @IsOptional()
  // @IsEnum(AlertSeverity)
  severity?: AlertSeverity

  // @IsOptional()
  // @IsEnum(AlertCategory)
  category?: AlertCategory

  // @IsOptional()
  // @IsNumber()
  // @Min(1)
  // @Max(100)
  // @Type(() => Number)
  limit?: number

  // @IsOptional()
  // @IsNumber()
  // @Min(0)
  // @Type(() => Number)
  offset?: number

  // @IsOptional()
  // @IsString()
  search?: string

  // @IsOptional()
  onlyActive?: boolean

  // @IsOptional()
  onlyVerified?: boolean
}
