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

  async create(dto: CreateGistDto): Promise<Gist> {
    const content = stripHtml(dto.content);
    const locationCell = this.geoService.encode(dto.lat, dto.lon);

    const { cid } = await this.ipfsService.pinJson({
      content,
      lat: dto.lat,
      lon: dto.lon,
      location_cell: locationCell,
      created_at: new Date().toISOString(),
    });

    const author = dto.authorAddress;
    const ttlSecs = dto.ttlHours ? dto.ttlHours * 3600 : undefined;
    // Security (#1040): Backend-submitted on-chain posts are ALWAYS anonymous (author = undefined).
    // The backend cannot verify ownership of a client-supplied authorAddress.
    // Signed posts must be submitted wallet-direct client-side by the user's wallet.
    const { gistId, txHash, mock } = await this.sorobanService.postGist(
      undefined,
      locationCell,
      cid,
      ttlSecs,
    );

    this.logger.log(`Gist posted → cell=${locationCell} cid=${cid} gistId=${gistId}`);

    const expiresAt = await this.resolveExpiry(gistId, mock, dto.ttlHours ?? DEFAULT_TTL_HOURS);

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
            author_address: author,
            expires_at: expiresAt,
          },
          manager,
        );
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        this.logger.debug(
          `Gist ${gistId} already indexed — returning existing row (SQLSTATE ${PG_UNIQUE_VIOLATION})`,
        );
        const existing = await this.gistRepository.findByStellarGistId(gistId);
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * The contract derives expiry from ledger time plus `ttl_secs`, which can
   * drift from the server clock. Prefer the expiry the contract actually
   * assigned; fall back to the server-clock estimate (mock mode, or if the
   * read fails).
   */
  private async resolveExpiry(gistId: string, mock: boolean | undefined, ttlHours: number): Promise<Date> {
    if (!mock) {
      try {
        const onChain = await this.sorobanService.getGist(gistId);
        if (onChain?.expiresAt) return new Date(onChain.expiresAt * 1000);
      } catch (err) {
        this.logger.warn(
          `Could not read on-chain expiry for gist ${gistId}; using server clock: ${(err as Error).message}`,
        );
      }
    }
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
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

  async getContent(id: string): Promise<Record<string, unknown>> {
    const gist = await this.gistRepository.findByGistId(id);
    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`);
    }

    if (!gist.content_hash) {
      throw new NotFoundException(`Content for gist ${id} not found`);
    }

    return this.ipfsService.getJson(gist.content_hash);
  }

  async report(id: string): Promise<{ count: number }> {
    const gist = await this.gistRepository.findByGistId(id);
    if (!gist) {
      throw new NotFoundException(`Gist with ID ${id} not found`);
    }

    const { count } = await this.sorobanService.reportGist(id);
    this.logger.log(`Gist reported → id=${id} count=${count}`);
    return { count };
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

  async getModerator(): Promise<{ moderatorAddress: string | null }> {
    const { admin } = await this.sorobanService.getAdmin();
    return { moderatorAddress: admin };
  }
}
