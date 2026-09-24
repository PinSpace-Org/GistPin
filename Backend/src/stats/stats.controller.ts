import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller({ path: 'stats', version: '1' })
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Platform totals: total/active/expired/hidden/signed/anonymous/reports',
    description:
      '"active" means the gist is not hidden, not expired (expires_at > now), and is_active.',
  })
  getOverview() {
    return this.statsService.getOverview();
  }
}
