import { IsString, IsNumber, IsOptional, IsDateString, IsIn, MaxLength, Min, Max, IsObject } from "class-validator"
import { Transform } from "class-transformer"

export class CreateGistDto {
  @IsString()
  @MaxLength(2000, { message: "Content must not exceed 2000 characters" })
  content: string

  @IsString()
  @IsIn(["tip", "alert", "story", "question", "event", "other"])
  type: string

  @IsNumber({}, { message: "Latitude must be a valid number" })
  @Min(-90, { message: "Latitude must be between -90 and 90" })
  @Max(90, { message: "Latitude must be between -90 and 90" })
  @Transform(({ value }) => Number.parseFloat(value))
  latitude: number

  @IsNumber({}, { message: "Longitude must be a valid number" })
  @Min(-180, { message: "Longitude must be between -180 and 180" })
  @Max(180, { message: "Longitude must be between -180 and 180" })
  @Transform(({ value }) => Number.parseFloat(value))
  longitude: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
