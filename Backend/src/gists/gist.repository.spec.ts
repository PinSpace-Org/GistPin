import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GistRepository } from './gist.repository';
import { Gist } from './entities/gist.entity';
import { DatabaseModule } from '../database/database.module';

type GistWithCoords = Gist & { lat: number; lon: number; distance_meters?: number };

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
      // Use a unique sentinel content so we can scope our assertion without
      // depending on row counts (which would race with parallel tests).
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

      // The sentinel content must not be persisted after a rollback.
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
});
