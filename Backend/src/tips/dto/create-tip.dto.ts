import type { TipCategory } from "../entities/tip.entity"

export class CreateTipDto {
  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(2000)
  content: string

  // @IsString()
  // @IsOptional()
  // @MaxLength(255)
  title?: string

  // @IsEnum(TipCategory)
  // @IsOptional()
  category?: TipCategory

  // @IsNumber()
  // @Min(-90)
  // @Max(90)
  latitude: number

  // @IsNumber()
  // @Min(-180)
  // @Max(180)
  longitude: number

  // @IsString()
  // @IsOptional()
  // @MaxLength(255)
  address?: string

  // @IsString()
  // @IsOptional()
  // @MaxLength(100)
  city?: string

  // @IsString()
  // @IsOptional()
  // @MaxLength(100)
  country?: string

  // @IsString()
  // @IsOptional()
  // @MaxLength(50)
  authorNickname?: string

  // @IsBoolean()
  // @IsOptional()
  isAnonymous?: boolean

  // @IsDateString()
  // @IsOptional()
  expiresAt?: string

  // @IsString()
  // @IsOptional()
  // @MaxLength(255)
  tags?: string

  // @IsOptional()
  metadata?: Record<string, any>
}
