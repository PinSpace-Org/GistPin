// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
import { Alert, AlertSeverity } from "./entities/alert.entity"
import type { CreateAlertDto } from "./dto/create-alert.dto"
import type { UpdateAlertDto } from "./dto/update-alert.dto"
import type { QueryAlertsDto } from "./dto/query-alerts.dto"

// @Injectable()
export class AlertsService {
  constructor(
    // @InjectRepository(Alert)
    private alertsRepository: any, // Repository<Alert>
  ) {}

  async create(createAlertDto: CreateAlertDto, reporterIp?: string): Promise<Alert> {
    const alert = this.alertsRepository.create({
      ...createAlertDto,
      reporterIp,
      location: `POINT(${createAlertDto.longitude} ${createAlertDto.latitude})`,
      expiresAt: createAlertDto.expiresAt
        ? new Date(createAlertDto.expiresAt)
        : this.getDefaultExpiration(createAlertDto.severity),
    })

    return this.alertsRepository.save(alert)
  }

  async findAll(queryDto: QueryAlertsDto): Promise<{ alerts: Alert[]; total: number }> {
    const queryBuilder = this.alertsRepository.createQueryBuilder("alert")

    // Filter by location if provided
    if (queryDto.latitude && queryDto.longitude && queryDto.radiusKm) {
      queryBuilder.andWhere(
        `ST_DWithin(
          alert.location,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
        {
          latitude: queryDto.latitude,
          longitude: queryDto.longitude,
          radius: queryDto.radiusKm * 1000, // Convert km to meters
        },
      )
    }

    // Filter by severity
    if (queryDto.severity) {
      queryBuilder.andWhere("alert.severity = :severity", { severity: queryDto.severity })
    }

    // Filter by category
    if (queryDto.category) {
      queryBuilder.andWhere("alert.category = :category", { category: queryDto.category })
    }

    // Filter by active status
    if (queryDto.onlyActive !== undefined) {
      queryBuilder.andWhere("alert.isActive = :isActive", { isActive: queryDto.onlyActive })
    }

    // Filter by verified status
    if (queryDto.onlyVerified !== undefined) {
      queryBuilder.andWhere("alert.isVerified = :isVerified", { isVerified: queryDto.onlyVerified })
    }

    // Filter out expired alerts
    queryBuilder.andWhere("(alert.expiresAt IS NULL OR alert.expiresAt > :now)", { now: new Date() })

    // Search functionality
    if (queryDto.search) {
      queryBuilder.andWhere("(alert.title ILIKE :search OR alert.content ILIKE :search)", {
        search: `%${queryDto.search}%`,
      })
    }

    // Order by severity (emergency first) and creation date
    queryBuilder.orderBy(
      "CASE alert.severity WHEN 'emergency' THEN 1 WHEN 'critical' THEN 2 WHEN 'warning' THEN 3 ELSE 4 END",
      "ASC",
    )
    queryBuilder.addOrderBy("alert.createdAt", "DESC")

    // Pagination
    const limit = queryDto.limit || 20
    const offset = queryDto.offset || 0
    queryBuilder.limit(limit).offset(offset)

    const [alerts, total] = await queryBuilder.getManyAndCount()

    return { alerts, total }
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.alertsRepository.findOne({
      where: { id, isActive: true },
    })

    if (!alert) {
      throw new Error("Alert not found") // NotFoundException in actual NestJS
    }

    return alert
  }

  async findNearby(latitude: number, longitude: number, radiusKm = 5): Promise<Alert[]> {
    return this.alertsRepository
      .createQueryBuilder("alert")
      .where(
        `ST_DWithin(
          alert.location,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
        {
          latitude,
          longitude,
          radius: radiusKm * 1000,
        },
      )
      .andWhere("alert.isActive = :isActive", { isActive: true })
      .andWhere("(alert.expiresAt IS NULL OR alert.expiresAt > :now)", { now: new Date() })
      .orderBy(
        "CASE alert.severity WHEN 'emergency' THEN 1 WHEN 'critical' THEN 2 WHEN 'warning' THEN 3 ELSE 4 END",
        "ASC",
      )
      .addOrderBy("alert.createdAt", "DESC")
      .getMany()
  }

  async findCritical(latitude?: number, longitude?: number, radiusKm = 10): Promise<Alert[]> {
    const queryBuilder = this.alertsRepository
      .createQueryBuilder("alert")
      .where("alert.severity IN (:...severities)", { severities: [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY] })
      .andWhere("alert.isActive = :isActive", { isActive: true })
      .andWhere("(alert.expiresAt IS NULL OR alert.expiresAt > :now)", { now: new Date() })

    if (latitude && longitude) {
      queryBuilder.andWhere(
        `ST_DWithin(
          alert.location,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
        { latitude, longitude, radius: radiusKm * 1000 },
      )
    }

    return queryBuilder
      .orderBy("CASE alert.severity WHEN 'emergency' THEN 1 ELSE 2 END", "ASC")
      .addOrderBy("alert.createdAt", "DESC")
      .getMany()
  }

  async update(id: string, updateAlertDto: UpdateAlertDto): Promise<Alert> {
    const alert = await this.findOne(id)

    Object.assign(alert, updateAlertDto)

    if (updateAlertDto.expiresAt) {
      alert.expiresAt = new Date(updateAlertDto.expiresAt)
    }

    return this.alertsRepository.save(alert)
  }

  async incrementView(id: string): Promise<void> {
    await this.alertsRepository.increment({ id }, "viewCount", 1)
  }

  async incrementConfirmation(id: string): Promise<void> {
    await this.alertsRepository.increment({ id }, "confirmationCount", 1)
  }

  async deactivate(id: string): Promise<void> {
    await this.alertsRepository.update(id, { isActive: false })
  }

  async remove(id: string): Promise<void> {
    const alert = await this.findOne(id)
    await this.alertsRepository.remove(alert)
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.alertsRepository
      .createQueryBuilder()
      .delete()
      .from(Alert)
      .where("expiresAt < :now", { now: new Date() })
      .execute()

    return result.affected || 0
  }

  private getDefaultExpiration(severity: AlertSeverity): Date {
    const now = new Date()
    switch (severity) {
      case AlertSeverity.EMERGENCY:
        return new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
      case AlertSeverity.CRITICAL:
        return new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6 hours
      case AlertSeverity.WARNING:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      case AlertSeverity.INFO:
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  }
}
