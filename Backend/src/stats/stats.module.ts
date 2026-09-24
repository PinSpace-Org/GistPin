import { Module } from '@nestjs/common';

import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { StatsCacheService } from './cache/stats-cache.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsCacheService],

@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
