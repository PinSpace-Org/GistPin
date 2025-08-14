import type { AuditService } from "./audit.service"
import type { CreateAuditLogDto } from "./dto/create-audit-log.dto"
import type { QueryAuditLogsDto } from "./dto/query-audit-logs.dto"
import type { AuditLog, EntityType } from "./entities/audit-log.entity"

// @Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // @Post()
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async create(/* @Body() */ createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    return this.auditService.createLog(createAuditLogDto)
  }

  // @Get()
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async findAll(/* @Query() */ queryDto: QueryAuditLogsDto): Promise<{
    data: AuditLog[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    return this.auditService.findAll(queryDto)
  }

  // @Get('statistics')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async getStatistics(
    /* @Query('startDate') */ startDate?: string,
    /* @Query('endDate') */ endDate?: string,
  ): Promise<{
    totalLogs: number
    errorCount: number
    actionBreakdown: Record<string, number>
    levelBreakdown: Record<string, number>
    entityTypeBreakdown: Record<string, number>
  }> {
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined
    return this.auditService.getStatistics(start, end)
  }

  // @Get('errors')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async findErrors(/* @Query('limit') */ limit?: number): Promise<AuditLog[]> {
    return this.auditService.findErrors(limit)
  }

  // @Get('entity/:entityType/:entityId')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async findByEntity(
    /* @Param('entityType') */ entityType: EntityType,
    /* @Param('entityId') */ entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditService.findByEntity(entityType, entityId)
  }

  // @Get('user/:userId')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async findByUser(/* @Param('userId') */ userId: string, /* @Query('limit') */ limit?: number): Promise<AuditLog[]> {
    return this.auditService.findByUser(userId, limit)
  }

  // @Get(':id')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async findOne(/* @Param('id') */ id: string): Promise<AuditLog> {
    return this.auditService.findById(id)
  }

  // @Post('cleanup/expired')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async cleanupExpired(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.auditService.cleanupExpiredLogs()
    return { deletedCount }
  }

  // @Post('cleanup/old')
  // @UseGuards(AdminGuard) // Uncomment and implement AdminGuard
  async cleanupOld(/* @Query('days') */ days?: number): Promise<{ deletedCount: number }> {
    const deletedCount = await this.auditService.cleanupOldLogs(days)
    return { deletedCount }
  }
}
