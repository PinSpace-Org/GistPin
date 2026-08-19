import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IndexerService } from './indexer.service';
import { IndexerState } from './indexer-state.entity';

import { SorobanModule } from '../soroban/soroban.module';
import { GistsModule } from '../gists/gists.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexerState]),
    SorobanModule,
    GistsModule,
    GeoModule,
  ],
  providers: [IndexerService],
})
export class IndexerModule {}