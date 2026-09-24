import { Controller, Get } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { StatsService } from './stats.service';
import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { QueryModerationDto } from './dto/query-moderation.dto';
import { QueryStatsEventsDto } from './dto/query-stats-events.dto';

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
  @Get('timeseries/gists')
  @SkipThrottle()
  @ApiOperation({ summary: 'Gists created over time, zero-filled per bucket' })
  getGistsTimeseries(@Query() query: QueryTimeseriesDto) {
    return this.statsService.getGistsTimeseries(query);
  }

  @Get('moderation')
  @SkipThrottle()
  @ApiOperation({ summary: 'Moderation signals: hidden/reported counts and top-reported gists' })
  getModeration(@Query() query: QueryModerationDto) {
    return this.statsService.getModerationStats(query);
  @Get('events')
  @SkipThrottle()
  @ApiOperation({ summary: 'Event counts per type per time bucket, plus recent events' })
  getEvents(@Query() query: QueryStatsEventsDto) {
    return this.statsService.getEventStats(query);
  }
}
