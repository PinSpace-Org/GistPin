import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Gist } from './entities/gist.entity';
import { PaginationHelper, PaginatedResponse } from '../common/utils/pagination.helper';

/** Postgres unique-violation SQLSTATE. */
export const PG_UNIQUE_VIOLATION = '23505';

export interface NearbyQuery {
  lat: number;
  lon: number;
  radiusMeters?: number;
  limit?: number;
  cursor?: string; // base64 encoded cursor or raw ISO date string
}

export interface CreateGistData {
  content: string;
  lat: number;
  lon: number;
  location_cell?: string;
  content_hash?: string;
  stellar_gist_id?: string;
  tx_hash?: string;
}

@Injectable()
export class GistRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Persist a new gist row. When a transactional `EntityManager` is supplied
   * (e.g. from `GistsService.create`), the INSERT joins the caller's
   * transaction so the write can be rolled back atomically. When no manager
   * is provided (e.g. from `IndexerService` on the connection pool), the
   * INSERT runs in its own implicit transaction.
   */
  async create(data: CreateGistData, manager?: EntityManager): Promise<Gist> {
    const {
      content,
      lat,
      lon,
      location_cell = null,
      content_hash = null,
      stellar_gist_id = null,
      tx_hash = null,
    } = data;

    const queryRunner = manager ?? this.dataSource;

    const result = await queryRunner.query<Gist[]>(
      `
      INSERT INTO gists (
        content, location, location_cell,
        content_hash, stellar_gist_id, tx_hash
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4, $5, $6, $7
      )
      RETURNING
        id, content, location_cell, content_hash,
        stellar_gist_id, tx_hash, created_at,
        ST_X(location::geometry) AS lon,
        ST_Y(location::geometry) AS lat
      `,
      [content, lon, lat, location_cell, content_hash, stellar_gist_id, tx_hash],
    );

    return result[0];
  }

  async findNearby(query: NearbyQuery): Promise<PaginatedResponse<Gist>> {
    const { lat, lon, radiusMeters = 500, limit = 20, cursor } = query;

    const params: unknown[] = [lon, lat, radiusMeters, limit];
    let cursorClause = '';

    if (cursor) {
      // Support both base64 encoded cursors and raw ISO strings
      const decoded = PaginationHelper.decodeCursor(cursor) ?? cursor;
      params.push(decoded);
      cursorClause = `AND g.created_at < $${params.length}`;
    }

    const items = await this.dataSource.query<Gist[]>(
      `
      SELECT
        g.id,
        g.content,
        g.location_cell,
        g.content_hash,
        g.stellar_gist_id,
        g.tx_hash,
        g.created_at,
        ST_X(g.location::geometry)                              AS lon,
        ST_Y(g.location::geometry)                              AS lat,
        ST_Distance(
          g.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )                                                        AS distance_meters
      FROM gists g
      WHERE ST_DWithin(
        g.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ${cursorClause}
      ORDER BY g.created_at DESC
      LIMIT $4
      `,
      params,
    );

    return PaginationHelper.buildResponse(items, limit);
  }

  async findByGistId(id: string): Promise<Gist | null> {
    const rows = await this.dataSource.query<Gist[]>(
      `
      SELECT
        id, content, location_cell, content_hash,
        stellar_gist_id, tx_hash, created_at,
        ST_X(location::geometry) AS lon,
        ST_Y(location::geometry) AS lat
      FROM gists
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByStellarGistId(stellarGistId: string): Promise<Gist | null> {
    const rows = await this.dataSource.query<Gist[]>(
      `
      SELECT
        id, content, location_cell, content_hash,
        stellar_gist_id, tx_hash, created_at,
        ST_X(location::geometry) AS lon,
        ST_Y(location::geometry) AS lat
      FROM gists
      WHERE stellar_gist_id = $1
      LIMIT 1
      `,
      [stellarGistId],
    );
    return rows[0] ?? null;
  }

  async existsByStellarGistId(stellarGistId: string): Promise<boolean> {
    const [row] = await this.dataSource.query<Array<{ cnt: string }>>(
      `SELECT COUNT(*) AS cnt FROM gists WHERE stellar_gist_id = $1`,
      [stellarGistId],
    );
    return parseInt(row.cnt, 10) > 0;
  }
}
