import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GistRepository } from './gist.repository';
import { Gist } from './entities/gist.entity';
import { DatabaseModule } from '../database/database.module';

type GistWithCoords = Gist & {
  lat: number;
  lon: number;
  distance_meters?: number;
  author_address?: string | null;
};

describe('GistRepository (integration)', () => {
  let repository: GistRepository;
  let dataSource: DataSource;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        TypeOrmModule.forFeature([Gist]),
      ],
      providers: [GistRepository],
    }).compile();

    repository = module.get<GistRepository>(GistRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Issue #98 — clean up sentinel rows created by the commit test so they
    // do not accumulate across CI runs and slow down subsequent test suites.
    await dataSource.query(`DELETE FROM gists WHERE stellar_gist_id LIKE 'tx-%'`);
    await module.close();
  });

  describe('create', () => {
    it('should persist a gist and return it with lat/lon', async () => {
      const gist = (await repository.create({
        content: 'integration test gist',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 's1t7d8c',
        content_hash: 'mock_test_cid',
      })) as GistWithCoords;

      expect(gist.id).toBeDefined();
      expect(gist.content).toBe('integration test gist');
      expect(gist.location_cell).toBe('s1t7d8c');
      expect(Number(gist.lat)).toBeCloseTo(9.0579, 3);
      expect(Number(gist.lon)).toBeCloseTo(7.4951, 3);
      expect(gist.created_at).toBeDefined();
    });
  });

  describe('findNearby', () => {
    it('should find gists within radius using ST_DWithin', async () => {
      await repository.create({
        content: 'nearby test',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
      });

      const result = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 500,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.count).toBeGreaterThan(0);

      for (const gist of result.data as GistWithCoords[]) {
        expect(gist.distance_meters).toBeDefined();
      }
    });

    it('should not find gists outside the radius', async () => {
      const result = await repository.findNearby({
        lat: 51.5074,
        lon: -0.1278,
        radiusMeters: 100,
        limit: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should respect the limit parameter', async () => {
      const result = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 5000,
        limit: 2,
      });

      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it('should support cursor pagination', async () => {
      const page1 = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 5000,
        limit: 2,
      });

      if (page1.pagination.hasMore && page1.pagination.cursor) {
        const page2 = await repository.findNearby({
          lat: 9.0579,
          lon: 7.4951,
          radiusMeters: 5000,
          limit: 2,
          cursor: page1.pagination.cursor,
        });

        const page1Ids = new Set(page1.data.map((g) => g.id));
        for (const gist of page2.data) {
          expect(page1Ids.has(gist.id)).toBe(false);
        }
      }
    });
  });

  describe('findByGistId', () => {
    it('should retrieve a gist by its UUID', async () => {
      const created = await repository.create({
        content: 'findById test',
        lat: 9.0579,
        lon: 7.4951,
      });

      const found = await repository.findByGistId(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.content).toBe('findById test');
    });

    it('should return null for a non-existent ID', async () => {
      const result = await repository.findByGistId('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('findByStellarGistId', () => {
    it('should retrieve a gist by its stellar_gist_id', async () => {
      const created = await repository.create({
        content: 'stellar gist id test',
        lat: 9.0579,
        lon: 7.4951,
        stellar_gist_id: 'stellar-abc-123',
      });

      const found = await repository.findByStellarGistId('stellar-abc-123');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.stellar_gist_id).toBe('stellar-abc-123');
    });

    it('should return null when stellar_gist_id does not exist', async () => {
      const result = await repository.findByStellarGistId('non-existent-stellar-id');
      expect(result).toBeNull();
    });

    it('should return null when stellar_gist_id is not set on any gist', async () => {
      await repository.create({
        content: 'no stellar id gist',
        lat: 9.0579,
        lon: 7.4951,
        // stellar_gist_id intentionally omitted
      });

      const result = await repository.findByStellarGistId('non-existent-stellar-id');
      expect(result).toBeNull();
    });
  });

  // Issue #98 — transaction rollback semantics for gist creation.
  describe('transaction', () => {
    it('rolls back the INSERT when the transaction body throws', async () => {
      const sentinel = `tx-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await expect(
        dataSource.transaction(async (manager) => {
          await repository.create(
            {
              content: sentinel,
              lat: 9.0579,
              lon: 7.4951,
              stellar_gist_id: `tx-rollback-${Date.now()}`,
            },
            manager,
          );
          throw new Error('Simulated failure inside transaction');
        }),
      ).rejects.toThrow('Simulated failure inside transaction');

      const nearby = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 50_000,
        limit: 200,
      });
      const leaked = nearby.data.find((g) => g.content === sentinel);
      expect(leaked).toBeUndefined();
    });

    it('commits the INSERT when the transaction body completes normally (manager arg)', async () => {
      const sentinel = `tx-commit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const stellarId = `tx-commit-${Date.now()}`;

      const result = await dataSource.transaction(async (manager) => {
        return repository.create(
          {
            content: sentinel,
            lat: 9.0579,
            lon: 7.4951,
            stellar_gist_id: stellarId,
          },
          manager,
        );
      });

      expect(result.content).toBe(sentinel);

      const found = await repository.findByStellarGistId(stellarId);
      expect(found).not.toBeNull();
      expect(found!.content).toBe(sentinel);
    });
  });

  describe('author_address persistence and filter', () => {
    it('should persist author_address on create', async () => {
      const gist = await repository.create({
        content: 'authored gist',
        lat: 9.0579,
        lon: 7.4951,
        author_address: 'GABC123',
      });

      expect(gist.author_address).toBe('GABC123');
    });

    it('should default author_address to null when not provided', async () => {
      const gist = await repository.create({
        content: 'anonymous gist',
        lat: 9.0579,
        lon: 7.4951,
      });

      expect(gist.author_address).toBeNull();
    });

    it('should filter by authorAddress and return only matching gists', async () => {
      await repository.create({
        content: 'alice nearby',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GALICE',
      });
      await repository.create({
        content: 'bob nearby',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GBOB',
      });

      const result = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 500,
        limit: 50,
        authorAddress: 'GALICE',
      });

      expect(result.data.length).toBeGreaterThan(0);
      for (const gist of result.data as GistWithCoords[]) {
        expect(gist.author_address).toBe('GALICE');
      }
      const bobMarker = 'bob-filter-author-marker';
      for (const gist of result.data as GistWithCoords[]) {
        expect(gist.content).not.toBe(bobMarker);
      }
    });

    it('should return empty result when authorAddress matches no gists in radius', async () => {
      await repository.create({
        content: 'far-away alice',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GALICE_FAR',
      });

      const result = await repository.findNearby({
        lat: 51.5074, // London
        lon: -0.1278,
        radiusMeters: 100,
        limit: 50,
        authorAddress: 'GALICE_FAR',
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should combine authorAddress filter with cursor pagination', async () => {
      await repository.create({
        content: 'paged alice 1',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GALICE_PAGED',
      });
      await repository.create({
        content: 'paged alice 2',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GALICE_PAGED',
      });
      await repository.create({
        content: 'paged alice 3',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
        author_address: 'GALICE_PAGED',
      });

      const page1 = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 5000,
        limit: 1,
        authorAddress: 'GALICE_PAGED',
      });

      expect(page1.data.length).toBeLessThanOrEqual(1);
      for (const gist of page1.data as GistWithCoords[]) {
        expect(gist.author_address).toBe('GALICE_PAGED');
      }

      if (page1.pagination.hasMore && page1.pagination.cursor) {
        const page2 = await repository.findNearby({
          lat: 9.0579,
          lon: 7.4951,
          radiusMeters: 5000,
          limit: 1,
          authorAddress: 'GALICE_PAGED',
          cursor: page1.pagination.cursor,
        });

        for (const gist of page2.data as GistWithCoords[]) {
          expect(gist.author_address).toBe('GALICE_PAGED');
        }

        if (page1.data[0] && page2.data[0]) {
          expect(page2.data[0].id).not.toBe(page1.data[0].id);
        }
      }
    });

    it('should not regress: omitting authorAddress still returns all gists in radius', async () => {
      await repository.create({
        content: 'unauthored regression check',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
      });

      const result = await repository.findNearby({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 500,
        limit: 50,
      });

      expect(result.data.length).toBeGreaterThan(0);
      const hasNullAuthor = result.data.some((g) => (g as GistWithCoords).author_address === null);
      expect(hasNullAuthor).toBe(true);
    });
  });

  describe('countNearby', () => {
    it('should return a numeric count of non-expired gists in radius', async () => {
      await repository.create({
        content: 'count test gist',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
      });

      const count = await repository.countNearby(9.0579, 7.4951, 500);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when no gists are in radius', async () => {
      const count = await repository.countNearby(51.5074, -0.1278, 100);
      expect(count).toBe(0);
    });
  });

  describe('countNearbyByCell', () => {
    it('should return cell breakdown array', async () => {
      await repository.create({
        content: 'cell breakdown test',
        lat: 9.058,
        lon: 7.495,
        location_cell: 's1t7d8c',
      });

      const rows = await repository.countNearbyByCell({
        lat: 9.0579,
        lon: 7.4951,
        radiusMeters: 500,
      });

      expect(Array.isArray(rows)).toBe(true);
      for (const row of rows) {
        expect(typeof row.cell).toBe('string');
        expect(typeof row.count).toBe('number');
      }
    });

    it('should return empty array when no gists are in radius', async () => {
      const rows = await repository.countNearbyByCell({
        lat: 51.5074,
        lon: -0.1278,
        radiusMeters: 100,
      });
      expect(rows).toHaveLength(0);
    });
  });
});
