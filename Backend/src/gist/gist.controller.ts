import { Controller, Get, Post, Patch, Param, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common"
import type { GistService } from "./gist.service"
import type { CreateGistDto } from "./dto/create-gist.dto"
import type { UpdateGistDto } from "./dto/update-gist.dto"
import type { QueryGistsDto } from "./dto/query-gists.dto"
import type { GistResponseDto } from "./dto/gist-response.dto"

@Controller("gists")
export class GistController {
  constructor(private readonly gistService: GistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(createGistDto: CreateGistDto): Promise<GistResponseDto> {
    return this.gistService.create(createGistDto)
  }

  @Get("nearby")
  async findNearby(queryDto: QueryGistsDto) {
    return this.gistService.findNearby(queryDto)
  }

  @Get("stats")
  async getStats() {
    return this.gistService.getStats()
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GistResponseDto> {
    return this.gistService.findOne(id)
  }

  @Patch(":id")
  async update(@Param('id', ParseUUIDPipe) id: string, updateGistDto: UpdateGistDto): Promise<GistResponseDto> {
    return this.gistService.update(id, updateGistDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.gistService.remove(id)
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param('id', ParseUUIDPipe) id: string): Promise<GistResponseDto> {
    return this.gistService.like(id)
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async report(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.gistService.report(id)
  }
}
