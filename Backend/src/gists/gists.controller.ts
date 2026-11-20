import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { GistsService } from './gists.service';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
import { Gist } from './entities/gist.entity';
import { PaginatedResponse } from '../common/utils/pagination.helper';

@ApiTags('gists')
@Controller({ path: 'gists', version: '1' })
export class GistsController {
  constructor(private readonly gistsService: GistsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Post a new anonymous gist at a location' })
  @ApiCreatedResponse({ description: 'The created gist', type: Gist })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(@Body() dto: CreateGistDto) {
    return this.decorateGist(await this.gistsService.create(dto));
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Find gists near a location' })
  @ApiOkResponse({ description: 'A page of gists near the given location' })
  async findNearby(@Query() query: QueryGistsDto) {
    const response = await this.gistsService.findNearby(query);
    return this.decoratePaginatedResponse(response);
  }

  // IMPORTANT: must be registered before @Get(':id') so NestJS does not
  // match literal strings as UUID parameters.
  @Get('count')
  @SkipThrottle()
  @ApiOperation({ summary: 'Count gists near a location (optionally broken down by cell)' })
  @ApiOkResponse({ description: 'The gist count, optionally broken down by cell' })
  countNearby(@Query() query: QueryGistsDto) {
    return this.gistsService.countNearby(query);
  }

  @Get('moderator')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the current moderator address' })
  @ApiOkResponse({ description: 'The current moderator address, or null if unset' })
  getModerator() {
    return this.gistsService.getModerator();
  }

  @Get(':id/content')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the raw IPFS content for a gist' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  @ApiOkResponse({ description: 'The raw IPFS content for the gist' })
  @ApiNotFoundResponse({ description: 'Gist or its content was not found' })
  findContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.gistsService.getContent(id);
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get a single gist by ID' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  @ApiOkResponse({ description: 'The gist', type: Gist })
  @ApiNotFoundResponse({ description: 'Gist was not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.decorateGist(await this.gistsService.findOne(id));
  }

  @Post(':id/report')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Report a gist for review' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  @ApiOkResponse({ description: 'The gist report count after this report' })
  @ApiNotFoundResponse({ description: 'Gist was not found' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async report(@Param('id', ParseUUIDPipe) id: string) {
    return this.gistsService.report(id);
  }

  private decorateGist(gist: Gist) {
    return {
      ...gist,
      gist_id: gist.stellar_gist_id,
      content_cid: gist.content_hash,
      is_active: gist.is_active ?? true,
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
