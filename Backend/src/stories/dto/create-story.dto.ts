import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDateString,
  MaxLength,
  MinLength,
  IsLatitude,
  IsLongitude,
} from "class-validator"
import { Transform } from "class-transformer"

export class CreateStoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsNumber()
  @IsLatitude()
  latitude: number

  @IsNumber()
  @IsLongitude()
  longitude: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isAnonymous?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorId?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
