import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { StatsService } from './stats.service';
import { QueryStatsEventsDto } from './dto/query-stats-events.dto';

@ApiTags('stats')
@Controller({ path: 'stats', version: '1' })
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('events')
  @SkipThrottle()
  @ApiOperation({ summary: 'Event counts per type per time bucket, plus recent events' })
  getEvents(@Query() query: QueryStatsEventsDto) {
    return this.statsService.getEventStats(query);
  }
}
