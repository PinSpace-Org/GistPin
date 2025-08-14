// import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max, Length } from 'class-validator';
// import { Type } from 'class-transformer';
import type { AlertSeverity, AlertCategory } from "../entities/alert.entity"

export class CreateAlertDto {
  // @IsString()
  // @Length(1, 200)
  title: string

  // @IsString()
  // @Length(1, 2000)
  content: string

  // @IsEnum(AlertSeverity)
  severity: AlertSeverity

  // @IsEnum(AlertCategory)
  category: AlertCategory

  // @IsNumber()
  // @Min(-90)
  // @Max(90)
  // @Type(() => Number)
  latitude: number

  // @IsNumber()
  // @Min(-180)
  // @Max(180)
  // @Type(() => Number)
  longitude: number

  // @IsOptional()
  // @IsNumber()
  // @Min(10)
  // @Max(50000)
  // @Type(() => Number)
  radiusMeters?: number

  // @IsOptional()
  // @IsDateString()
  expiresAt?: string

  // @IsOptional()
  // @IsBoolean()
  isVerified?: boolean

  // @IsOptional()
  metadata?: Record<string, any>
}
