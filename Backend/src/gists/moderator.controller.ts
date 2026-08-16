import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GistsService } from './gists.service';

class ModeratorResponseDto {
  @ApiProperty({
    description: 'The on-chain moderator address, or null if the contract has not been initialized',
    nullable: true,
    example: 'GABCDE...XYZQ',
  })
  moderator: string | null;
}

@ApiTags('moderator')
@Controller({ path: 'moderator', version: '1' })
export class ModeratorController {
  constructor(private readonly gistsService: GistsService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get the current on-chain moderator address',
    description:
      'Returns the address of the account that has moderator privileges on the GistRegistry contract. ' +
      'Returns null if the contract has not been initialized yet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Moderator address retrieved successfully',
    type: ModeratorResponseDto,
  })
  getModerator(): Promise<ModeratorResponseDto> {
    return this.gistsService.getModerator();
  }
}
