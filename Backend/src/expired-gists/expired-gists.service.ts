import { NotFoundException, BadRequestException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ExpiredGist, type GistType, CleanupStatus } from "./entities/expired-gist.entity"
import type { QueryExpiredGistsDto } from "./dto/query-expired-gists.dto"
import type { CleanupOptionsDto, RecoverGistDto } from "./dto/cleanup-options.dto"

// @Injectable()
export class ExpiredGistsService {
  constructor(
    // @InjectRepository(ExpiredGist)
    private readonly expiredGistRepository: Repository<ExpiredGist>,
  ) {}

  async findAll(queryDto: QueryExpiredGistsDto) {
    const {
      gistType,
      cleanupStatus,
      expirationDateFrom,
      expirationDateTo,
      cleanupDateFrom,
      cleanupDateTo,
      archivedBy,
      limit,
      offset,
    } = queryDto

    const queryBuilder = this.expiredGistRepository.createQueryBuilder("expired_gist")

    if (gistType) {
      queryBuilder.andWhere("expired_gist.gistType = :gistType", { gistType })
    }

    if (cleanupStatus) {
      queryBuilder.andWhere("expired_gist.cleanupStatus = :cleanupStatus", { cleanupStatus })
    }

    if (expirationDateFrom && expirationDateTo) {
      queryBuilder.andWhere("expired_gist.expirationDate BETWEEN :from AND :to", {
        from: expirationDateFrom,
        to: expirationDateTo,
      })
    } else if (expirationDateFrom) {
      queryBuilder.andWhere("expired_gist.expirationDate >= :from", { from: expirationDateFrom })
    } else if (expirationDateTo) {
      queryBuilder.andWhere("expired_gist.expirationDate <= :to", { to: expirationDateTo })
    }

    if (cleanupDateFrom && cleanupDateTo) {
      queryBuilder.andWhere("expired_gist.cleanupDate BETWEEN :from AND :to", {
        from: cleanupDateFrom,
        to: cleanupDateTo,
      })
    }

    if (archivedBy) {
      queryBuilder.andWhere("expired_gist.archivedBy = :archivedBy", { archivedBy })
    }

    const [items, total] = await queryBuilder
      .orderBy("expired_gist.expirationDate", "DESC")
      .limit(limit)
      .offset(offset)
      .getManyAndCount()

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    }
  }

  async findById(id: string): Promise<ExpiredGist> {
    const expiredGist = await this.expiredGistRepository.findOne({ where: { id } })
    if (!expiredGist) {
      throw new NotFoundException(`Expired gist with ID ${id} not found`)
    }
    return expiredGist
  }

  async archiveExpiredGist(
    gistType: GistType,
    originalId: string,
    originalData: any,
    reason?: string,
  ): Promise<ExpiredGist> {
    const existingArchive = await this.expiredGistRepository.findOne({
      where: { gistType, originalId },
    })

    if (existingArchive) {
      // Update existing archive
      existingArchive.originalData = originalData
      existingArchive.cleanupStatus = CleanupStatus.ARCHIVED
      existingArchive.cleanupDate = new Date()
      if (reason) existingArchive.reason = reason
      return await this.expiredGistRepository.save(existingArchive)
    }

    const expiredGist = this.expiredGistRepository.create({
      gistType,
      originalId,
      originalData,
      expirationDate: originalData.expiresAt || new Date(),
      cleanupStatus: CleanupStatus.ARCHIVED,
      cleanupDate: new Date(),
      reason,
    })

    return await this.expiredGistRepository.save(expiredGist)
  }

  async performCleanup(options: CleanupOptionsDto): Promise<{ processed: number; archived: number; deleted: number }> {
    const { gistType, olderThanDays, dryRun, batchSize, archiveBeforeDelete, reason } = options

    let query = this.expiredGistRepository
      .createQueryBuilder("expired_gist")
      .where("expired_gist.cleanupStatus = :status", { status: CleanupStatus.PENDING })

    if (gistType) {
      query = query.andWhere("expired_gist.gistType = :gistType", { gistType })
    }

    if (olderThanDays) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      query = query.andWhere("expired_gist.expirationDate < :cutoffDate", { cutoffDate })
    }

    const expiredGists = await query.limit(batchSize).getMany()

    let processed = 0
    let archived = 0
    let deleted = 0

    if (dryRun) {
      return { processed: expiredGists.length, archived: 0, deleted: 0 }
    }

    for (const gist of expiredGists) {
      try {
        if (archiveBeforeDelete && gist.cleanupStatus === CleanupStatus.PENDING) {
          gist.cleanupStatus = CleanupStatus.ARCHIVED
          gist.cleanupDate = new Date()
          if (reason) gist.reason = reason
          await this.expiredGistRepository.save(gist)
          archived++
        } else {
          gist.cleanupStatus = CleanupStatus.DELETED
          gist.cleanupDate = new Date()
          await this.expiredGistRepository.save(gist)
          deleted++
        }
        processed++
      } catch (error) {
        console.error(`Failed to cleanup gist ${gist.id}:`, error)
      }
    }

    return { processed, archived, deleted }
  }

  async recoverGist(recoverDto: RecoverGistDto, recoveredBy: string): Promise<any> {
    const { originalId, gistType, reason } = recoverDto

    const expiredGist = await this.expiredGistRepository.findOne({
      where: { originalId, gistType },
    })

    if (!expiredGist) {
      throw new NotFoundException(`Expired gist not found for ${gistType} with ID ${originalId}`)
    }

    if (expiredGist.cleanupStatus === CleanupStatus.DELETED) {
      throw new BadRequestException("Cannot recover a deleted gist")
    }

    // Mark as recovered
    expiredGist.cleanupStatus = CleanupStatus.RECOVERED
    expiredGist.recoveredBy = recoveredBy
    expiredGist.recoveryDate = new Date()
    if (reason) expiredGist.reason = reason

    await this.expiredGistRepository.save(expiredGist)

    return expiredGist.originalData
  }

  async getCleanupStatistics(): Promise<any> {
    const stats = await this.expiredGistRepository
      .createQueryBuilder("expired_gist")
      .select(["expired_gist.gistType as gistType", "expired_gist.cleanupStatus as cleanupStatus", "COUNT(*) as count"])
      .groupBy("expired_gist.gistType, expired_gist.cleanupStatus")
      .getRawMany()

    const totalByType = await this.expiredGistRepository
      .createQueryBuilder("expired_gist")
      .select(["expired_gist.gistType as gistType", "COUNT(*) as total"])
      .groupBy("expired_gist.gistType")
      .getRawMany()

    return {
      byTypeAndStatus: stats,
      totalByType,
      lastCleanup: await this.getLastCleanupDate(),
    }
  }

  private async getLastCleanupDate(): Promise<Date | null> {
    const result = await this.expiredGistRepository
      .createQueryBuilder("expired_gist")
      .select("MAX(expired_gist.cleanupDate)", "lastCleanup")
      .where("expired_gist.cleanupDate IS NOT NULL")
      .getRawOne()

    return result?.lastCleanup || null
  }

  async deleteOldArchives(olderThanDays = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await this.expiredGistRepository
      .createQueryBuilder()
      .delete()
      .where("cleanupStatus = :status", { status: CleanupStatus.DELETED })
      .andWhere("cleanupDate < :cutoffDate", { cutoffDate })
      .execute()

    return result.affected || 0
  }
}
