import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IndexerService } from './indexer.service';
import { IndexerState } from './indexer-state.entity';
import { IndexedEvent } from './indexed-event.entity';
import { EventLogRepository } from './event-log.repository';

import { SorobanModule } from '../soroban/soroban.module';
import { GistsModule } from '../gists/gists.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexerState, IndexedEvent]),
    SorobanModule,
    GistsModule,
    GeoModule,
  ],
  providers: [IndexerService, EventLogRepository],
  exports: [EventLogRepository],
})
export class IndexerModule {}