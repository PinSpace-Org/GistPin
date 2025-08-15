import { NotFoundException } from "@nestjs/common"
import type { Repository, SelectQueryBuilder } from "typeorm"
import { Tip, TipStatus, type TipCategory } from "./entities/tip.entity"
import type { CreateTipDto } from "./dto/create-tip.dto"
import type { UpdateTipDto } from "./dto/update-tip.dto"
import type { QueryTipsDto } from "./dto/query-tips.dto"

// @Injectable()
export class TipsService {
  constructor(
    // @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
  ) {}

  async create(createTipDto: CreateTipDto, ipAddress?: string, userAgent?: string): Promise<Tip> {
    const tip = this.tipRepository.create({
      ...createTipDto,
      location: `POINT(${createTipDto.longitude} ${createTipDto.latitude})`,
      ipAddress,
      userAgent,
      expiresAt: createTipDto.expiresAt ? new Date(createTipDto.expiresAt) : null,
    })

    return await this.tipRepository.save(tip)
  }

  async findAll(queryDto: QueryTipsDto): Promise<{ tips: Tip[]; total: number; page: number; totalPages: number }> {
    const {
      page,
      limit,
      latitude,
      longitude,
      radius,
      category,
      status,
      search,
      city,
      country,
      tags,
      includeExpired,
      sortBy,
      sortOrder,
      minHelpfulnessRating,
    } = queryDto

    let queryBuilder: SelectQueryBuilder<Tip> = this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.deletedAt IS NULL")

    // Location-based filtering
    if (latitude && longitude) {
      queryBuilder = queryBuilder.andWhere(
        `ST_DWithin(tip.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)`,
        { latitude, longitude, radius: radius * 1000 }, // Convert km to meters
      )
    }

    // Category filtering
    if (category) {
      queryBuilder = queryBuilder.andWhere("tip.category = :category", { category })
    }

    // Status filtering
    if (status) {
      queryBuilder = queryBuilder.andWhere("tip.status = :status", { status })
    } else {
      queryBuilder = queryBuilder.andWhere("tip.status = :activeStatus", { activeStatus: TipStatus.ACTIVE })
    }

    // Expiration filtering
    if (!includeExpired) {
      queryBuilder = queryBuilder.andWhere("(tip.expiresAt IS NULL OR tip.expiresAt > NOW())")
    }

    // Location filtering
    if (city) {
      queryBuilder = queryBuilder.andWhere("LOWER(tip.city) LIKE LOWER(:city)", { city: `%${city}%` })
    }

    if (country) {
      queryBuilder = queryBuilder.andWhere("LOWER(tip.country) LIKE LOWER(:country)", { country: `%${country}%` })
    }

    // Search filtering
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        "(LOWER(tip.content) LIKE LOWER(:search) OR LOWER(tip.title) LIKE LOWER(:search) OR LOWER(tip.tags) LIKE LOWER(:search))",
        { search: `%${search}%` },
      )
    }

    // Tags filtering
    if (tags) {
      queryBuilder = queryBuilder.andWhere("LOWER(tip.tags) LIKE LOWER(:tags)", { tags: `%${tags}%` })
    }

    // Helpfulness rating filtering
    if (minHelpfulnessRating !== undefined) {
      queryBuilder = queryBuilder.andWhere("tip.helpfulnessRating >= :minRating", { minRating: minHelpfulnessRating })
    }

    // Add distance calculation if location provided
    if (latitude && longitude) {
      queryBuilder = queryBuilder.addSelect(
        `ST_Distance(tip.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)`,
        "distance",
      )
    }

    // Sorting
    if (latitude && longitude && sortBy === "distance") {
      queryBuilder = queryBuilder.orderBy("distance", sortOrder)
    } else {
      queryBuilder = queryBuilder.orderBy(`tip.${sortBy}`, sortOrder)
    }

    // Pagination
    const offset = (page - 1) * limit
    queryBuilder = queryBuilder.skip(offset).take(limit)

    const [tips, total] = await queryBuilder.getManyAndCount()
    const totalPages = Math.ceil(total / limit)

    return { tips, total, page, totalPages }
  }

  async findOne(id: string): Promise<Tip> {
    const tip = await this.tipRepository.findOne({
      where: { id },
    })

    if (!tip) {
      throw new NotFoundException(`Tip with ID ${id} not found`)
    }

    return tip
  }

  async findNearby(latitude: number, longitude: number, radius = 5, limit = 20): Promise<Tip[]> {
    return await this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.deletedAt IS NULL")
      .andWhere("tip.status = :status", { status: TipStatus.ACTIVE })
      .andWhere("(tip.expiresAt IS NULL OR tip.expiresAt > NOW())")
      .andWhere(`ST_DWithin(tip.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)`, {
        latitude,
        longitude,
        radius: radius * 1000,
      })
      .addSelect(
        `ST_Distance(tip.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)`,
        "distance",
      )
      .orderBy("distance", "ASC")
      .limit(limit)
      .getMany()
  }

  async findByCategory(category: TipCategory, limit = 20): Promise<Tip[]> {
    return await this.tipRepository.find({
      where: {
        category,
        status: TipStatus.ACTIVE,
      },
      order: { helpfulnessRating: "DESC", createdAt: "DESC" },
      take: limit,
    })
  }

  async findTopRated(limit = 20): Promise<Tip[]> {
    return await this.tipRepository.find({
      where: {
        status: TipStatus.ACTIVE,
      },
      order: { helpfulnessRating: "DESC", helpfulCount: "DESC" },
      take: limit,
    })
  }

  async update(id: string, updateTipDto: UpdateTipDto): Promise<Tip> {
    const tip = await this.findOne(id)

    // Update location if coordinates changed
    if (updateTipDto.latitude && updateTipDto.longitude) {
      updateTipDto["location"] = `POINT(${updateTipDto.longitude} ${updateTipDto.latitude})`
    }

    // Update expiration date if provided
    if (updateTipDto.expiresAt) {
      updateTipDto["expiresAt"] = new Date(updateTipDto.expiresAt)
    }

    Object.assign(tip, updateTipDto)
    return await this.tipRepository.save(tip)
  }

  async incrementView(id: string): Promise<void> {
    await this.tipRepository.increment({ id }, "viewCount", 1)
  }

  async markHelpful(id: string, isHelpful: boolean): Promise<Tip> {
    const tip = await this.findOne(id)

    if (isHelpful) {
      tip.helpfulCount += 1
    } else {
      tip.notHelpfulCount += 1
    }

    // Recalculate helpfulness rating
    const totalVotes = tip.helpfulCount + tip.notHelpfulCount
    tip.helpfulnessRating = totalVotes > 0 ? (tip.helpfulCount / totalVotes) * 5 : 0

    return await this.tipRepository.save(tip)
  }

  async remove(id: string): Promise<void> {
    const tip = await this.findOne(id)
    await this.tipRepository.softDelete(id)
  }

  async expireOldTips(): Promise<number> {
    const result = await this.tipRepository
      .createQueryBuilder()
      .update(Tip)
      .set({ status: TipStatus.EXPIRED, isExpired: true })
      .where("expiresAt < NOW()")
      .andWhere("status = :status", { status: TipStatus.ACTIVE })
      .execute()

    return result.affected || 0
  }

  async getStatistics(): Promise<any> {
    const totalTips = await this.tipRepository.count()
    const activeTips = await this.tipRepository.count({ where: { status: TipStatus.ACTIVE } })
    const expiredTips = await this.tipRepository.count({ where: { status: TipStatus.EXPIRED } })

    const categoryStats = await this.tipRepository
      .createQueryBuilder("tip")
      .select("tip.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("tip.status = :status", { status: TipStatus.ACTIVE })
      .groupBy("tip.category")
      .getRawMany()

    const topCities = await this.tipRepository
      .createQueryBuilder("tip")
      .select("tip.city", "city")
      .addSelect("COUNT(*)", "count")
      .where("tip.status = :status", { status: TipStatus.ACTIVE })
      .andWhere("tip.city IS NOT NULL")
      .groupBy("tip.city")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany()

    return {
      totalTips,
      activeTips,
      expiredTips,
      categoryStats,
      topCities,
    }
  }
}
