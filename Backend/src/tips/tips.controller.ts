import type { Request } from "express"
import type { TipsService } from "./tips.service"
import type { CreateTipDto } from "./dto/create-tip.dto"
import type { UpdateTipDto } from "./dto/update-tip.dto"
import type { QueryTipsDto } from "./dto/query-tips.dto"
import type { TipCategory } from "./entities/tip.entity"

// @Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  // @Post()
  async create(/* @Body() */ createTipDto: CreateTipDto, /* @Req() */ req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get("User-Agent")
    return await this.tipsService.create(createTipDto, ipAddress, userAgent)
  }

  // @Get()
  async findAll(/* @Query() */ queryDto: QueryTipsDto) {
    return await this.tipsService.findAll(queryDto)
  }

  // @Get('nearby')
  async findNearby(
    /* @Query('latitude', ParseFloatPipe) */ latitude: number,
    /* @Query('longitude', ParseFloatPipe) */ longitude: number,
    /* @Query('radius', ParseFloatPipe) */ radius?: number,
    /* @Query('limit', ParseIntPipe) */ limit?: number,
  ) {
    return await this.tipsService.findNearby(latitude, longitude, radius, limit)
  }

  // @Get('category/:category')
  async findByCategory(
    /* @Param('category') */ category: TipCategory,
    /* @Query('limit', ParseIntPipe) */ limit?: number,
  ) {
    return await this.tipsService.findByCategory(category, limit)
  }

  // @Get('top-rated')
  async findTopRated(/* @Query('limit', ParseIntPipe) */ limit?: number) {
    return await this.tipsService.findTopRated(limit)
  }

  // @Get('statistics')
  async getStatistics() {
    return await this.tipsService.getStatistics()
  }

  // @Get(':id')
  async findOne(/* @Param('id', ParseUUIDPipe) */ id: string) {
    const tip = await this.tipsService.findOne(id)
    await this.tipsService.incrementView(id)
    return tip
  }

  // @Patch(':id')
  async update(/* @Param('id', ParseUUIDPipe) */ id: string, /* @Body() */ updateTipDto: UpdateTipDto) {
    return await this.tipsService.update(id, updateTipDto)
  }

  // @Patch(':id/helpful')
  async markHelpful(
    /* @Param('id', ParseUUIDPipe) */ id: string,
    /* @Body('isHelpful', ParseBoolPipe) */ isHelpful: boolean,
  ) {
    return await this.tipsService.markHelpful(id, isHelpful)
  }

  // @Delete(':id')
  async remove(/* @Param('id', ParseUUIDPipe) */ id: string) {
    await this.tipsService.remove(id)
    return { message: "Tip deleted successfully" }
  }

  // @Post('cleanup/expired')
  async cleanupExpiredTips() {
    const expiredCount = await this.tipsService.expireOldTips()
    return { message: `${expiredCount} tips marked as expired` }
  }
}
