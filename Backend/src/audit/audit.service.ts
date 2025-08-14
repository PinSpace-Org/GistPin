import { Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type AuditLog, type AuditAction, AuditLevel, type EntityType } from "./entities/audit-log.entity"
import type { CreateAuditLogDto } from "./dto/create-audit-log.dto"
import type { QueryAuditLogsDto } from "./dto/query-audit-logs.dto"

// @Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(
    // @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...createAuditLogDto,
        createdAt: new Date(),
      })

      return await this.auditLogRepository.save(auditLog)
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack)
      throw error
    }
  }

  async logAction(
    action: AuditAction,
    entityType: EntityType,
    description: string,
    options: Partial<CreateAuditLogDto> = {},
  ): Promise<AuditLog> {
    const auditLogDto: CreateAuditLogDto = {
      action,
      entityType,
      description,
      level: AuditLevel.INFO,
      ...options,
    }

    return this.createLog(auditLogDto)
  }

  async logError(
    action: AuditAction,
    entityType: EntityType,
    error: Error,
    options: Partial<CreateAuditLogDto> = {},
  ): Promise<AuditLog> {
    const auditLogDto: CreateAuditLogDto = {
      action,
      entityType,
      description: `Error during ${action}: ${error.message}`,
      level: AuditLevel.ERROR,
      isError: true,
      errorMessage: error.message,
      stackTrace: error.stack,
      ...options,
    }

    return this.createLog(auditLogDto)
  }

  async findAll(queryDto: QueryAuditLogsDto): Promise<{
    data: AuditLog[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const {
      action,
      level,
      entityType,
      entityId,
      userId,
      sessionId,
      ipAddress,
      startDate,
      endDate,
      isError,
      search,
      latitude,
      longitude,
      radius,
      page,
      limit,
      sortBy,
      sortOrder,
    } = queryDto

    const queryBuilder = this.auditLogRepository.createQueryBuilder("audit")

    // Apply filters
    if (action) {
      queryBuilder.andWhere("audit.action = :action", { action })
    }

    if (level) {
      queryBuilder.andWhere("audit.level = :level", { level })
    }

    if (entityType) {
      queryBuilder.andWhere("audit.entityType = :entityType", { entityType })
    }

    if (entityId) {
      queryBuilder.andWhere("audit.entityId = :entityId", { entityId })
    }

    if (userId) {
      queryBuilder.andWhere("audit.userId = :userId", { userId })
    }

    if (sessionId) {
      queryBuilder.andWhere("audit.sessionId = :sessionId", { sessionId })
    }

    if (ipAddress) {
      queryBuilder.andWhere("audit.ipAddress = :ipAddress", { ipAddress })
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("audit.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
    }

    if (isError !== undefined) {
      queryBuilder.andWhere("audit.isError = :isError", { isError })
    }

    if (search) {
      queryBuilder.andWhere("(audit.description ILIKE :search OR audit.errorMessage ILIKE :search)", {
        search: `%${search}%`,
      })
    }

    // Location-based filtering
    if (latitude && longitude && radius) {
      queryBuilder.andWhere(
        `ST_DWithin(
          ST_SetSRID(ST_MakePoint(audit.longitude, audit.latitude), 4326),
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
          :radius
        )`,
        { latitude, longitude, radius },
      )
    }

    // Sorting
    queryBuilder.orderBy(`audit.${sortBy}`, sortOrder)

    // Pagination
    const offset = (page - 1) * limit
    queryBuilder.skip(offset).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ where: { id } })
  }

  async findByEntity(entityType: EntityType, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: "DESC" },
    })
  }

  async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  async findErrors(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { isError: true },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalLogs: number
    errorCount: number
    actionBreakdown: Record<string, number>
    levelBreakdown: Record<string, number>
    entityTypeBreakdown: Record<string, number>
  }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder("audit")

    if (startDate && endDate) {
      queryBuilder.where("audit.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
    }

    const totalLogs = await queryBuilder.getCount()
    const errorCount = await queryBuilder.andWhere("audit.isError = true").getCount()

    // Action breakdown
    const actionResults = await this.auditLogRepository
      .createQueryBuilder("audit")
      .select("audit.action", "action")
      .addSelect("COUNT(*)", "count")
      .groupBy("audit.action")
      .getRawMany()

    const actionBreakdown = actionResults.reduce((acc, item) => {
      acc[item.action] = Number.parseInt(item.count)
      return acc
    }, {})

    // Level breakdown
    const levelResults = await this.auditLogRepository
      .createQueryBuilder("audit")
      .select("audit.level", "level")
      .addSelect("COUNT(*)", "count")
      .groupBy("audit.level")
      .getRawMany()

    const levelBreakdown = levelResults.reduce((acc, item) => {
      acc[item.level] = Number.parseInt(item.count)
      return acc
    }, {})

    // Entity type breakdown
    const entityResults = await this.auditLogRepository
      .createQueryBuilder("audit")
      .select("audit.entityType", "entityType")
      .addSelect("COUNT(*)", "count")
      .groupBy("audit.entityType")
      .getRawMany()

    const entityTypeBreakdown = entityResults.reduce((acc, item) => {
      acc[item.entityType] = Number.parseInt(item.count)
      return acc
    }, {})

    return {
      totalLogs,
      errorCount,
      actionBreakdown,
      levelBreakdown,
      entityTypeBreakdown,
    }
  }

  async cleanupExpiredLogs(): Promise<number> {
    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where("expiresAt IS NOT NULL AND expiresAt < :now", { now: new Date() })
      .execute()

    this.logger.log(`Cleaned up ${result.affected} expired audit logs`)
    return result.affected || 0
  }

  async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where("createdAt < :cutoffDate", { cutoffDate })
      .execute()

    this.logger.log(`Cleaned up ${result.affected} old audit logs (older than ${daysToKeep} days)`)
    return result.affected || 0
  }
}
