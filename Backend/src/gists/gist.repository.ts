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
  cursor?: string;
  authorAddress?: string;
}

export interface CreateGistData {
  content: string;
  lat: number;
  lon: number;
  location_cell?: string;
  content_hash?: string;
  stellar_gist_id?: string;
  tx_hash?: string;
  author_address?: string;
  expires_at?: Date;
}

@Injectable()
export class GistRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(data: CreateGistData, manager?: EntityManager): Promise<Gist> {
    const {
      content,
      lat,
      lon,
      location_cell = null,
      content_hash = null,
      stellar_gist_id = null,
      tx_hash = null,
      author_address = null,
      expires_at,
    } = data;

    const expiresAt = expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const queryRunner = manager ?? this.dataSource;

    const result = await queryRunner.query<Gist[]>(
      `
      INSERT INTO gists (
        content, location, location_cell,
        content_hash, stellar_gist_id, tx_hash, author_address, expires_at
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4, $5, $6, $7, $8, $9
      )
      RETURNING
        id, content, location_cell, content_hash,
        stellar_gist_id, tx_hash, author_address, created_at, expires_at,
        ST_X(location::geometry) AS lon,
        ST_Y(location::geometry) AS lat
      `,
      [content, lon, lat, location_cell, content_hash, stellar_gist_id, tx_hash, author_address, expiresAt],
    );

    return result[0];
  }

  async findNearby(query: NearbyQuery): Promise<PaginatedResponse<Gist>> {
    const { lat, lon, radiusMeters = 500, limit = 20, cursor, authorAddress } = query;

    const params: unknown[] = [lon, lat, radiusMeters, limit];
    const clauses: string[] = [];

    clauses.push(`g.expires_at > NOW()`);

    if (cursor) {
      const decoded = PaginationHelper.decodeCursor(cursor) ?? cursor;
      params.push(decoded);
      clauses.push(`g.created_at < $${params.length}`);
    }

    if (authorAddress) {
      params.push(authorAddress);
      clauses.push(`g.author_address = $${params.length}`);
    }

    const extraWhere = `AND ${clauses.join(' AND ')}`;

    const rows = await this.dataSource.query<Array<Gist & { distance_meters: string }>>(
      `
      SELECT
        g.id,
        g.content,
        g.location_cell,
        g.content_hash,
        g.stellar_gist_id,
        g.tx_hash,
        g.author_address,
        g.created_at,
        g.expires_at,
        ST_X(g.location::geometry)                              AS lon,
        ST_Y(g.location::geometry)                              AS lat,
        ST_Distance(
          g.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )                                                        AS distance_meters
      FROM gists g
      WHERE ST_DWithin(
        g.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      AND g.expires_at > NOW()
      ${extraWhere}
      ORDER BY distance_meters ASC, g.created_at DESC
      LIMIT $4
      `,
      params,
    );

    const items: Gist[] = rows.map((r) => ({
      ...r,
      distanceMeters: parseFloat(r.distance_meters),
    }));

    return PaginationHelper.buildResponse(items, limit);
  }

  async findByGistId(id: string): Promise<Gist | null> {
    const rows = await this.dataSource.query<Gist[]>(
      `
      SELECT
        id, content, location_cell, content_hash,
        stellar_gist_id, tx_hash, author_address, created_at, expires_at,
        ST_X(location::geometry) AS lon,
        ST_Y(location::geometry) AS lat
      FROM gists
      WHERE id = $1
        AND expires_at > NOW()
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
        stellar_gist_id, tx_hash, author_address, created_at, expires_at,
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

  async deleteExpired(): Promise<number> {
    const result = await this.dataSource.query<Array<{ count: string }>>(
      `WITH deleted AS (DELETE FROM gists WHERE expires_at <= NOW() RETURNING id)
       SELECT COUNT(*) AS count FROM deleted`,
    );
    return parseInt(result[0].count, 10);
  }

  async countNearby(lat: number, lon: number, radiusMeters: number): Promise<number> {
    const [row] = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*) AS count FROM gists
       WHERE ST_DWithin(
         location::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         $3
       ) AND expires_at > NOW()`,
      [lon, lat, radiusMeters],
    );
    return parseInt(row.count, 10);
  }

  async countNearbyByCell(
    query: Pick<NearbyQuery, 'lat' | 'lon' | 'radiusMeters'>,
  ): Promise<Array<{ cell: string; count: number }>> {
    const { lat, lon, radiusMeters = 500 } = query;
    const rows = await this.dataSource.query<Array<{ location_cell: string; count: string }>>(
      `SELECT location_cell, COUNT(*) AS count FROM gists
       WHERE ST_DWithin(
         location::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         $3
       ) AND expires_at > NOW()
       GROUP BY location_cell ORDER BY count DESC`,
      [lon, lat, radiusMeters],
    );
    return rows.map((r) => ({ cell: r.location_cell, count: parseInt(r.count, 10) }));
  }
}
