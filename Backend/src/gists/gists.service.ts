import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
import { GistRepository } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';
import { PaginatedResponse } from '../common/utils/pagination.helper';
import { stripHtml } from 'src/common/utils/sanitize';

@Injectable()
export class GistsService {
  private readonly logger = new Logger(GistsService.name);

  constructor(
    private readonly gistRepository: GistRepository,
    private readonly geoService: GeoService,
    private readonly ipfsService: IpfsService,
    private readonly sorobanService: SorobanService,
  ) {}

  async create(dto: CreateGistDto): Promise<Gist> {
    // Issue 87 — sanitize content before storing
    const content = stripHtml(dto.content);

    const locationCell = this.geoService.encode(dto.lat, dto.lon);

    const { cid } = await this.ipfsService.pinJson({
      content,
      lat: dto.lat,
      lon: dto.lon,
      location_cell: locationCell,
      created_at: new Date().toISOString(),
    });

    const { gistId, txHash } = await this.sorobanService.postGist(locationCell, cid, dto.author);

    this.logger.log(`Gist posted → cell=${locationCell} cid=${cid} gistId=${gistId}`);

    return this.gistRepository.create({
      content,
      lat: dto.lat,
      lon: dto.lon,
      location_cell: locationCell,
      content_hash: cid,
      stellar_gist_id: gistId,
      tx_hash: txHash,
      author_address: dto.author,
    });
  }

  async findNearby(query: QueryGistsDto): Promise<PaginatedResponse<Gist>> {
    return this.gistRepository.findNearby({
      lat: query.lat,
      lon: query.lon,
      radiusMeters: query.radius,
      limit: query.limit,
      cursor: query.cursor,
      authorAddress: query.authorAddress,
    });
  }

  async findOne(id: string): Promise<Gist> {
    // Issue 96 — return 404 when no gist matches the UUID
    const gist = await this.gistRepository.findByGistId(id);
    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`);
    }
    return gist;
  }
}
