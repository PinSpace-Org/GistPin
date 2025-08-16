import type { ExpiredGistsService } from "./expired-gists.service"
import type { QueryExpiredGistsDto } from "./dto/query-expired-gists.dto"
import type { CleanupOptionsDto, RecoverGistDto } from "./dto/cleanup-options.dto"

// @Controller('expired-gists')
export class ExpiredGistsController {
  constructor(private readonly expiredGistsService: ExpiredGistsService) {}

  // @Get()
  async findAll(/* @Query() */ queryDto: QueryExpiredGistsDto) {
    return await this.expiredGistsService.findAll(queryDto)
  }

  // @Get('statistics')
  async getStatistics() {
    return await this.expiredGistsService.getCleanupStatistics()
  }

  // @Get(':id')
  async findOne(/* @Param('id') */ id: string) {
    return await this.expiredGistsService.findById(id)
  }

  // @Post('cleanup')
  async performCleanup(/* @Body() */ cleanupOptions: CleanupOptionsDto) {
    return await this.expiredGistsService.performCleanup(cleanupOptions)
  }

  // @Post('recover')
  async recoverGist(
    /* @Body() */ recoverDto: RecoverGistDto,
    // This would typically come from authentication context
    // @CurrentUser() user: any
  ) {
    const recoveredBy = "system" // user?.id || 'system';
    return await this.expiredGistsService.recoverGist(recoverDto, recoveredBy)
  }

  // @Delete('archives')
  async deleteOldArchives(/* @Query('olderThanDays') */ olderThanDays?: number) {
    const days = olderThanDays ? Number.parseInt(olderThanDays.toString()) : 90
    const deletedCount = await this.expiredGistsService.deleteOldArchives(days)
    return { deletedCount, message: `Deleted ${deletedCount} old archives` }
  }
}
