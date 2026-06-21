import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { GistsService } from './gists.service';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';

@ApiTags('gists')
@Controller({ path: 'gists', version: '1' })
export class GistsController {
  constructor(private readonly gistsService: GistsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Post a new anonymous gist at a location' })
  create(@Body() dto: CreateGistDto) {
    return this.gistsService.create(dto);
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Find gists near a location' })
  findNearby(@Query() query: QueryGistsDto) {
    return this.gistsService.findNearby(query);
  }

  @Get('count')
  @SkipThrottle()
  @ApiOperation({ summary: 'Count active gists within a radius' })
  countNearby(@Query() query: QueryGistsDto) {
    return this.gistsService.countNearby(query);
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get a single gist by ID' })
  @ApiParam({ name: 'id', description: 'Gist UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gistsService.findOne(id);
  }
}
