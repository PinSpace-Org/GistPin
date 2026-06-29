import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Human-readable name for the API key', example: 'Integration - CI/CD' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Scopes to grant to the API key', example: ['gists:read', 'gists:write'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Rate limit per minute', example: 60, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMin?: number;
}
