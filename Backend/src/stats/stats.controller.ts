import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
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
  @ApiOkResponse({
    description: 'Platform-wide gist totals',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        expired: { type: 'number' },
        hidden: { type: 'number' },
        uniqueAuthors: { type: 'number' },
        signed: { type: 'number' },
        anonymous: { type: 'number' },
        apiSubmitted: { type: 'number' },
        indexedOnly: { type: 'number' },
        totalReports: { type: 'number' },
      },
    },
  })
  getOverview() {
    return this.statsService.getOverview();
  }

  @Get('timeseries/gists')
  @SkipThrottle()
  @ApiOperation({ summary: 'Gists created over time, zero-filled per bucket' })
  @ApiOkResponse({
    description: 'Per-bucket gist creation counts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bucket: { type: 'string', format: 'date-time' },
          count: { type: 'number' },
          signed: { type: 'number' },
          anonymous: { type: 'number' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '`from`/`to` are invalid, or the range is too large' })
  getGistsTimeseries(@Query() query: QueryTimeseriesDto) {
    return this.statsService.getGistsTimeseries(query);
  }

  @Get('moderation')
  @SkipThrottle()
  @ApiOperation({ summary: 'Moderation signals: hidden/reported counts and top-reported gists' })
  @ApiOkResponse({
    description: 'Moderation summary, report histogram and top-reported gists',
    schema: {
      type: 'object',
      properties: {
        hiddenCount: { type: 'number' },
        reportedCount: { type: 'number' },
        totalReports: { type: 'number' },
        histogram: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bucket: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        topReported: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              reportCount: { type: 'number' },
              hidden: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  getModeration(@Query() query: QueryModerationDto) {
    return this.statsService.getModerationStats(query);
  }

  @Get('events')
  @SkipThrottle()
  @ApiOperation({ summary: 'Event counts per type per time bucket, plus recent events' })
  @ApiOkResponse({
    description: 'Per-bucket event counts and the most recent events',
    schema: {
      type: 'object',
      properties: {
        buckets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bucket: { type: 'string', format: 'date-time' },
              counts: { type: 'object', additionalProperties: { type: 'number' } },
            },
          },
        },
        recent: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              ledger: { type: 'number' },
              stellarGistId: { type: 'string', nullable: true },
              observedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '`from`/`to` are invalid, or the range is too large' })
  getEvents(@Query() query: QueryStatsEventsDto) {
    return this.statsService.getEventStats(query);
  }
}
