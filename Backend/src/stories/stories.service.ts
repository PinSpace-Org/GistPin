import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Story } from "./entities/story.entity"
import type { CreateStoryDto } from "./dto/create-story.dto"
import type { UpdateStoryDto } from "./dto/update-story.dto"
import type { QueryStoriesDto } from "./dto/query-stories.dto"

@Injectable()
export class StoriesService {
  private readonly storyRepository: Repository<Story>

  constructor(storyRepository: Repository<Story>) {
    this.storyRepository = storyRepository
  }

  async create(createStoryDto: CreateStoryDto): Promise<Story> {
    const { latitude, longitude, ...storyData } = createStoryDto

    // Create Point geometry for location
    const location = {
      type: "Point",
      coordinates: [longitude, latitude],
    }

    const story = this.storyRepository.create({
      ...storyData,
      location: location as any,
    })

    return await this.storyRepository.save(story)
  }

  async findAll(queryDto: QueryStoriesDto): Promise<{
    stories: Story[]
    total: number
    hasMore: boolean
  }> {
    const { latitude, longitude, radiusKm, category, search, authorId, isActive, limit, offset, sortBy, sortOrder } =
      queryDto

    let queryBuilder = this.storyRepository
      .createQueryBuilder("story")
      .where("story.isActive = :isActive", { isActive })

    // Location-based filtering
    if (latitude && longitude) {
      queryBuilder = queryBuilder
        .addSelect(
          `ST_Distance_Sphere(story.location, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326))`,
          "distance",
        )
        .andWhere(
          `ST_Distance_Sphere(story.location, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)) <= :radius`,
          { radius: radiusKm * 1000 }, // Convert km to meters
        )
    }

    // Category filtering
    if (category) {
      queryBuilder = queryBuilder.andWhere("story.category = :category", {
        category,
      })
    }

    // Author filtering
    if (authorId) {
      queryBuilder = queryBuilder.andWhere("story.authorId = :authorId", {
        authorId,
      })
    }

    // Search filtering
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        "(story.content ILIKE :search OR story.title ILIKE :search OR story.locationName ILIKE :search)",
        { search: `%${search}%` },
      )
    }

    // Sorting
    if (sortBy === "distance" && latitude && longitude) {
      queryBuilder = queryBuilder.orderBy("distance", sortOrder)
    } else {
      queryBuilder = queryBuilder.orderBy(`story.${sortBy}`, sortOrder)
    }

    // Pagination
    queryBuilder = queryBuilder.skip(offset).take(limit + 1) // Take one extra to check if there are more

    const stories = await queryBuilder.getMany()
    const hasMore = stories.length > limit

    if (hasMore) {
      stories.pop() // Remove the extra story
    }

    const total = await queryBuilder.getCount()

    return {
      stories,
      total,
      hasMore,
    }
  }

  async findOne(id: string): Promise<Story> {
    const story = await this.storyRepository.findOne({
      where: { id, isActive: true },
    })

    if (!story) {
      throw new NotFoundException(`Story with ID ${id} not found`)
    }

    // Increment view count
    await this.storyRepository.increment({ id }, "viewCount", 1)
    story.viewCount += 1

    return story
  }

  async update(id: string, updateStoryDto: UpdateStoryDto): Promise<Story> {
    const story = await this.findOne(id)

    Object.assign(story, updateStoryDto)
    return await this.storyRepository.save(story)
  }

  async remove(id: string): Promise<void> {
    const story = await this.findOne(id)

    // Soft delete by setting isActive to false
    story.isActive = false
    await this.storyRepository.save(story)
  }

  async incrementLikes(id: string): Promise<Story> {
    const story = await this.findOne(id)
    await this.storyRepository.increment({ id }, "likeCount", 1)
    story.likeCount += 1
    return story
  }

  async decrementLikes(id: string): Promise<Story> {
    const story = await this.findOne(id)
    if (story.likeCount > 0) {
      await this.storyRepository.decrement({ id }, "likeCount", 1)
      story.likeCount -= 1
    }
    return story
  }

  async findNearby(latitude: number, longitude: number, radiusKm = 5, limit = 20): Promise<Story[]> {
    return await this.storyRepository
      .createQueryBuilder("story")
      .where("story.isActive = :isActive", { isActive: true })
      .andWhere(
        `ST_Distance_Sphere(story.location, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)) <= :radius`,
        { radius: radiusKm * 1000 },
      )
      .orderBy(`ST_Distance_Sphere(story.location, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326))`, "ASC")
      .limit(limit)
      .getMany()
  }

  async getStoriesByCategory(category: string): Promise<Story[]> {
    return await this.storyRepository.find({
      where: { category, isActive: true },
      order: { createdAt: "DESC" },
    })
  }

  async cleanupExpiredStories(): Promise<number> {
    const result = await this.storyRepository
      .createQueryBuilder()
      .update(Story)
      .set({ isActive: false })
      .where("expiresAt IS NOT NULL AND expiresAt < :now", { now: new Date() })
      .execute()

    return result.affected || 0
  }
}
