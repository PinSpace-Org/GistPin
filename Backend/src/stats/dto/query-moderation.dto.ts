import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';

export class QueryModerationDto {
  @ApiPropertyOptional({ description: 'Max topReported entries (1-50)', default: 10 })
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}
