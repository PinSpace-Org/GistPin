import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gist } from './entities/gist.entity';
import { GistRepository } from './gist.repository';
import { GistsService } from './gists.service';
import { GistsController } from './gists.controller';
import { GeoModule } from '../geo/geo.module';
import { IpfsModule } from '../ipfs/ipfs.module';
import { SorobanModule } from '../soroban/soroban.module';

@Module({
  imports: [TypeOrmModule.forFeature([Gist]), GeoModule, IpfsModule, SorobanModule],
  controllers: [GistsController],
  providers: [GistRepository, GistsService],
  exports: [GistsService, GistRepository],
})
export class GistsModule {}
