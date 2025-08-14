import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Gist } from "./entities/gist.entity"
import type { CreateGistDto } from "./dto/create-gist.dto"
import type { UpdateGistDto } from "./dto/update-gist.dto"
import type { QueryGistsDto } from "./dto/query-gists.dto"
import { GistResponseDto } from "./dto/gist-response.dto"

@Injectable()
export class GistService {
  constructor(private readonly gistRepository: Repository<Gist>) {}

  async create(createGistDto: CreateGistDto): Promise<GistResponseDto> {
    const gist = this.gistRepository.create({
      ...createGistDto,
      expiresAt: createGistDto.expiresAt ? new Date(createGistDto.expiresAt) : null,
    })

    const savedGist = await this.gistRepository.save(gist)
    return new GistResponseDto(savedGist)
  }

  async findNearby(queryDto: QueryGistsDto): Promise<{
    gists: GistResponseDto[]
    total: number
    hasMore: boolean
  }> {
    const { latitude, longitude, radius, type, category, limit, offset, sortBy, sortOrder, includeExpired } = queryDto

    // Build the query with spatial distance calculation
    let query = this.gistRepository
      .createQueryBuilder("gist")
      .select([
        "gist.*",
        `(6371 * acos(cos(radians(${latitude})) * cos(radians(gist.latitude)) * cos(radians(gist.longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(gist.latitude)))) AS distance`,
      ])
      .where("gist.isActive = :isActive", { isActive: true })
      .having(`distance <= :radius`, { radius })

    // Add type filter
    if (type) {
      query = query.andWhere("gist.type = :type", { type })
    }

    // Add category filter
    if (category) {
      query = query.andWhere("gist.category = :category", { category })
    }

    // Handle expiration
    if (!includeExpired) {
      query = query.andWhere("(gist.expiresAt IS NULL OR gist.expiresAt > :now)", { now: new Date() })
    }

    // Add sorting
    if (sortBy === "distance") {
      query = query.orderBy("distance", sortOrder)
    } else {
      query = query.orderBy(`gist.${sortBy}`, sortOrder)
      if (sortBy !== "distance") {
        query = query.addOrderBy("distance", "ASC") // Secondary sort by distance
      }
    }

    // Get total count for pagination
    const totalQuery = query.clone()
    const total = await totalQuery.getCount()

    // Apply pagination
    query = query.limit(limit).offset(offset)

    const rawResults = await query.getRawMany()

    const gists = rawResults.map(
      (raw) =>
        new GistResponseDto(
          {
            id: raw.gist_id,
            content: raw.gist_content,
            type: raw.gist_type,
            latitude: Number.parseFloat(raw.gist_latitude),
            longitude: Number.parseFloat(raw.gist_longitude),
            locationName: raw.gist_locationName,
            category: raw.gist_category,
            metadata: raw.gist_metadata,
            isActive: raw.gist_isActive,
            isReported: raw.gist_isReported,
            viewCount: raw.gist_viewCount,
            likeCount: raw.gist_likeCount,
            expiresAt: raw.gist_expiresAt,
            createdAt: raw.gist_createdAt,
            updatedAt: raw.gist_updatedAt,
          } as Gist,
          Number.parseFloat(raw.distance),
        ),
    )

    return {
      gists,
      total,
      hasMore: offset + limit < total,
    }
  }

  async findOne(id: string): Promise<GistResponseDto> {
    const gist = await this.gistRepository.findOne({
      where: { id, isActive: true },
    })

    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`)
    }

    // Increment view count
    await this.gistRepository.increment({ id }, "viewCount", 1)
    gist.viewCount += 1

    return new GistResponseDto(gist)
  }

  async update(id: string, updateGistDto: UpdateGistDto): Promise<GistResponseDto> {
    const gist = await this.gistRepository.findOne({
      where: { id, isActive: true },
    })

    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`)
    }

    // Update the gist
    Object.assign(gist, updateGistDto)
    const updatedGist = await this.gistRepository.save(gist)

    return new GistResponseDto(updatedGist)
  }

  async remove(id: string): Promise<void> {
    const gist = await this.gistRepository.findOne({
      where: { id, isActive: true },
    })

    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`)
    }

    // Soft delete by setting isActive to false
    await this.gistRepository.update(id, { isActive: false })
  }

  async like(id: string): Promise<GistResponseDto> {
    const gist = await this.gistRepository.findOne({
      where: { id, isActive: true },
    })

    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`)
    }

    await this.gistRepository.increment({ id }, "likeCount", 1)
    gist.likeCount += 1

    return new GistResponseDto(gist)
  }

  async report(id: string): Promise<void> {
    const gist = await this.gistRepository.findOne({
      where: { id, isActive: true },
    })

    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`)
    }

    await this.gistRepository.update(id, { isReported: true })
  }

  async getStats(): Promise<{
    totalGists: number
    activeGists: number
    gistsByType: Record<string, number>
    recentActivity: number
  }> {
    const totalGists = await this.gistRepository.count()
    const activeGists = await this.gistRepository.count({
      where: { isActive: true },
    })

    // Get gists by type
    const typeStats = await this.gistRepository
      .createQueryBuilder("gist")
      .select("gist.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("gist.isActive = :isActive", { isActive: true })
      .groupBy("gist.type")
      .getRawMany()

    const gistsByType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = Number.parseInt(stat.count)
      return acc
    }, {})

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentActivity = await this.gistRepository.count({
      where: {
        isActive: true,
        createdAt: { $gte: yesterday } as any,
      },
    })

    return {
      totalGists,
      activeGists,
      gistsByType,
      recentActivity,
    }
  }
}
