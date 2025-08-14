// import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Ip, ParseUUIDPipe, ParseFloatPipe, ParseIntPipe } from '@nestjs/common';
import type { AlertsService } from "./alerts.service"
import type { CreateAlertDto } from "./dto/create-alert.dto"
import type { UpdateAlertDto } from "./dto/update-alert.dto"
import type { QueryAlertsDto } from "./dto/query-alerts.dto"

// @Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // @Post()
  async create(
    // @Body()
    createAlertDto: CreateAlertDto,
    // @Ip()
    ip: string,
  ) {
    return this.alertsService.create(createAlertDto, ip)
  }

  // @Get()
  async findAll(
    // @Query()
    queryDto: QueryAlertsDto,
  ) {
    return this.alertsService.findAll(queryDto)
  }

  // @Get('nearby')
  async findNearby(
    // @Query('latitude', ParseFloatPipe)
    latitude: number,
    // @Query('longitude', ParseFloatPipe)
    longitude: number,
    // @Query('radius', ParseFloatPipe)
    radius?: number,
  ) {
    return this.alertsService.findNearby(latitude, longitude, radius)
  }

  // @Get('critical')
  async findCritical(
    // @Query('latitude')
    latitude?: number,
    // @Query('longitude')
    longitude?: number,
    // @Query('radius', ParseFloatPipe)
    radius?: number,
  ) {
    const lat = latitude ? Number.parseFloat(latitude.toString()) : undefined
    const lng = longitude ? Number.parseFloat(longitude.toString()) : undefined
    return this.alertsService.findCritical(lat, lng, radius)
  }

  // @Get(':id')
  async findOne(
    // @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    return this.alertsService.findOne(id)
  }

  // @Patch(':id')
  async update(
    // @Param('id', ParseUUIDPipe)
    id: string,
    // @Body()
    updateAlertDto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, updateAlertDto)
  }

  // @Patch(':id/view')
  async incrementView(
    // @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    await this.alertsService.incrementView(id)
    return { message: "View count incremented" }
  }

  // @Patch(':id/confirm')
  async incrementConfirmation(
    // @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    await this.alertsService.incrementConfirmation(id)
    return { message: "Confirmation count incremented" }
  }

  // @Patch(':id/deactivate')
  async deactivate(
    // @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    await this.alertsService.deactivate(id)
    return { message: "Alert deactivated" }
  }

  // @Delete(':id')
  async remove(
    // @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    await this.alertsService.remove(id)
    return { message: "Alert deleted" }
  }

  // @Delete('cleanup/expired')
  async cleanupExpired() {
    const count = await this.alertsService.cleanupExpired()
    return { message: `Cleaned up ${count} expired alerts` }
  }
}
