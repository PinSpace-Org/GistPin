import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags, ApiParam, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { GistsService } from './gists.service';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
import { Gist } from './entities/gist.entity';
import { PaginatedResponse } from '../common/utils/pagination.helper';

class ReportResponseDto {
  @ApiProperty({ description: 'Updated report count after this submission' })
  report_count: number;
}

@ApiTags('gists')
@Controller({ path: 'gists', version: '1' })
export class GistsController {
  constructor(private readonly gistsService: GistsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Post a new anonymous gist at a location' })
  async create(@Body() dto: CreateGistDto) {
    return this.decorateGist(await this.gistsService.create(dto));
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Find gists near a location' })
  async findNearby(@Query() query: QueryGistsDto) {
    const response = await this.gistsService.findNearby(query);
    return this.decoratePaginatedResponse(response);
  }

  // IMPORTANT: must be registered before @Get(':id') so NestJS does not
  // match the literal string "count" as a UUID parameter.
  @Get('count')
  @SkipThrottle()
  @ApiOperation({ summary: 'Count gists near a location (optionally broken down by cell)' })
  countNearby(@Query() query: QueryGistsDto) {
    return this.gistsService.countNearby(query);
  }

  @Get(':id/content')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the raw IPFS content for a gist' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  findContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.gistsService.getContent(id);
  }

  @Post(':id/report')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a gist for off-chain review (anyone; advisory only)' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  @ApiResponse({ status: 200, description: 'Report submitted; returns new count', type: ReportResponseDto })
  @ApiResponse({ status: 404, description: 'Gist not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  reportGist(@Param('id', ParseUUIDPipe) id: string): Promise<ReportResponseDto> {
    return this.gistsService.reportGist(id);
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get a single gist by ID, including is_active and report_count' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.decorateGist(await this.gistsService.findOne(id));
  }

  private decorateGist(gist: Gist) {
    return {
      ...gist,
      gist_id: gist.stellar_gist_id,
      content_cid: gist.content_hash,
      is_active: gist.is_active ?? (gist.expires_at > new Date() && !gist.hidden),
      report_count: gist.report_count ?? 0,
    };
  }

  private decoratePaginatedResponse(response: PaginatedResponse<Gist>) {
    return {
      ...response,
      data: response.data.map((gist) => this.decorateGist(gist)),
    };
  }
}
