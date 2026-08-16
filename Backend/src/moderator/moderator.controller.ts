import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ModeratorService } from './moderator.service';
import { ModeratorResponseDto } from './dto/moderator-response.dto';

@ApiTags('moderator')
@Controller({ path: 'moderator', version: '1' })
export class ModeratorController {
  constructor(private readonly moderatorService: ModeratorService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the current moderator address' })
  @ApiOkResponse({ type: ModeratorResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Moderator address is not configured' })
  getModerator(): ModeratorResponseDto {
    return this.moderatorService.getModerator();
  }
}
