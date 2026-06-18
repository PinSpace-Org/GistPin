import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { SorobanModule } from '../soroban/soroban.module';
import { GistsModule } from '../gists/gists.module';

@Module({
  imports: [SorobanModule, GistsModule],
  providers: [IndexerService],
import { GeoModule } from '../geo/geo.module';
import { GistRepository } from '../gists/gist.repository';

@Module({
  imports: [SorobanModule, GeoModule],
  providers: [IndexerService, GistRepository],
})
export class IndexerModule {}
