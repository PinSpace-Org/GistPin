import { Controller, Get, Post, Patch, Param, Delete, Query, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common"
import type { StoriesService } from "./stories.service"
import type { CreateStoryDto } from "./dto/create-story.dto"
import type { UpdateStoryDto } from "./dto/update-story.dto"
import type { QueryStoriesDto } from "./dto/query-stories.dto"

@Controller("stories")
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(createStoryDto: CreateStoryDto) {
    return await this.storiesService.create(createStoryDto)
  }

  @Get()
  async findAll(@Query() queryDto: QueryStoriesDto) {
    return await this.storiesService.findAll(queryDto);
  }

  @Get("nearby")
  async findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.storiesService.findNearby(
      Number.parseFloat(latitude),
      Number.parseFloat(longitude),
      radiusKm ? Number.parseFloat(radiusKm) : undefined,
      limit ? Number.parseInt(limit) : undefined,
    )
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    return await this.storiesService.getStoriesByCategory(category);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.storiesService.findOne(id);
  }

  @Patch(":id")
  async update(@Param('id', ParseUUIDPipe) id: string, updateStoryDto: UpdateStoryDto) {
    return await this.storiesService.update(id, updateStoryDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.storiesService.remove(id);
  }

  @Post(':id/like')
  async like(@Param('id', ParseUUIDPipe) id: string) {
    return await this.storiesService.incrementLikes(id);
  }

  @Delete(':id/like')
  async unlike(@Param('id', ParseUUIDPipe) id: string) {
    return await this.storiesService.decrementLikes(id);
  }

  @Post("cleanup-expired")
  @HttpCode(HttpStatus.OK)
  async cleanupExpired() {
    const count = await this.storiesService.cleanupExpiredStories()
    return { message: `Cleaned up ${count} expired stories` }
  }
}
