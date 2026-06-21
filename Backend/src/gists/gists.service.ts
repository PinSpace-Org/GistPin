import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
import { GistRepository, PG_UNIQUE_VIOLATION } from './gist.repository';
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
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gistRepository: GistRepository,
    private readonly geoService: GeoService,
    private readonly ipfsService: IpfsService,
    private readonly sorobanService: SorobanService,
  ) {}

  /**
   * Create a gist end-to-end.
   *
   * Issue #98 — atomicity:
   *   - External side-effects (sanitize, geo-encode, IPFS pin, Soroban post)
   *     happen OUTSIDE the database transaction because they cannot be
   *     rolled back from Postgres and would just block a connection slot.
   *   - The actual database INSERT runs inside `dataSource.transaction()` so
   *     any error thrown during the write rolls back the row atomically and
   *     future related writes (audit log, related tables) join the same tx.
   *   - A duplicate `stellar_gist_id` (e.g. retried Soroban post) raises a
   *     Postgres unique-violation (SQLSTATE 23505); we catch it and return
   *     the existing row so the API becomes safely idempotent.
   */
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

    try {
      return await this.dataSource.transaction(async (manager) => {
        return this.gistRepository.create(
          {
            content,
            lat: dto.lat,
            lon: dto.lon,
            location_cell: locationCell,
            content_hash: cid,
            stellar_gist_id: gistId,
            tx_hash: txHash,
          },
          manager,
        );
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        // Concurrent or retried create with the same on-chain gist ID — the
        // winning transaction already persisted the row. Return it so the
        // caller observes a logically idempotent success. Demoted to debug
        // because this path is the expected happy-path outcome under retries.
        this.logger.debug(
          `Gist ${gistId} already indexed — returning existing row (SQLSTATE ${PG_UNIQUE_VIOLATION})`,
        );
        const existing = await this.gistRepository.findByStellarGistId(gistId);
        if (existing) return existing;
      }
      throw err;
    }
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

  async countNearby(
    query: QueryGistsDto,
  ): Promise<{ count: number; radius: number; lat: number; lon: number; breakdown?: Array<{ cell: string; count: number }> }> {
    const { lat, lon, radius = 500, breakdown } = query;
    const count = await this.gistRepository.countNearby(lat, lon, radius);
    if (breakdown) {
      const cells = await this.gistRepository.countNearbyByCell(lat, lon, radius);
      return { count, radius, lat, lon, breakdown: cells };
    }
    return { count, radius, lat, lon };
  }
}
