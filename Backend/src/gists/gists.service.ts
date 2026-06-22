import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
import { GistRepository, PG_UNIQUE_VIOLATION } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';
import { PaginatedResponse } from '../common/utils/pagination.helper';
import { stripHtml } from '../common/utils/sanitize';

const DEFAULT_TTL_HOURS = 24;

export interface CountNearbyResult {
  count: number;
  radius: number;
  lat: number;
  lon: number;
  breakdown?: Array<{ cell: string; count: number }>;
}

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

    // Issue #604 — compute expiry from ttlHours (default 24 h)
    const ttlHours = dto.ttlHours ?? DEFAULT_TTL_HOURS;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

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
            author_address: dto.author,
            expires_at: expiresAt,
          },
          manager,
        );
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        // Concurrent or retried create with the same on-chain gist ID — the
        // winning transaction already persisted the row. Return it so the
        // caller observes a logically idempotent success.
        this.logger.debug(
          `Gist ${gistId} already indexed — returning existing row (SQLSTATE ${PG_UNIQUE_VIOLATION})`,
        );
        const existing = await this.gistRepository.findByStellarGistId(gistId);
        if (existing) return existing;
      }
      throw err;
    }
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
    const gist = await this.gistRepository.findByGistId(id);
    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`);
    }
    return gist;
  }

  async countNearby(query: QueryGistsDto): Promise<CountNearbyResult> {
    const { lat, lon, radius = 500, breakdown } = query;

    if (breakdown) {
      const rows = await this.gistRepository.countNearbyByCell({ lat, lon, radiusMeters: radius });
      const total = rows.reduce((sum, r) => sum + r.count, 0);
      return { count: total, radius, lat, lon, breakdown: rows };
    }

    const count = await this.gistRepository.countNearby(lat, lon, radius);
    return { count, radius, lat, lon };
  }
}
