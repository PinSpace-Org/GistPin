import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Gist } from './entities/gist.entity';
import { GistRepository } from './gist.repository';
import { GistsService } from './gists.service';
import { GistsController } from './gists.controller';
import { GistCleanupService } from './gist-cleanup.service';
import { GeoModule } from '../geo/geo.module';
import { IpfsModule } from '../ipfs/ipfs.module';
import { SorobanModule } from '../soroban/soroban.module';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Gist]), GeoModule, IpfsModule, SorobanModule],
  controllers: [GistsController],
  providers: [GistRepository, GistsService, GistCleanupService],
  exports: [GistsService, GistRepository],
})
export class GistsModule {}
