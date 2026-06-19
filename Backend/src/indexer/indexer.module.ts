import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { SorobanModule } from '../soroban/soroban.module';
import { GistsModule } from '../gists/gists.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [SorobanModule, GistsModule, GeoModule],
  providers: [IndexerService],
})
export class IndexerModule {}
