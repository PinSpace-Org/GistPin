import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { GistRepository } from '../src/gists/gist.repository';
import { Gist } from '../src/gists/entities/gist.entity';
import { IpfsService } from '../src/ipfs/ipfs.service';
import { SorobanService } from '../src/soroban/soroban.service';
import { createIpfsServiceMock } from './mocks/ipfs.service.mock';
import { createSorobanServiceMock } from './mocks/soroban.service.mock';
import { prepareTestDatabase, truncateGistsTable } from './setup';

const API_ROOT = '/v1/gists';
const HEALTH_ROOT = '/v1/health';

jest.setTimeout(30000);

describe('Gists lifecycle (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let gistRepository: GistRepository;
  let ipfsMock = createIpfsServiceMock();
  let sorobanMock = createSorobanServiceMock();

  const seedGist = async (overrides: Partial<Gist> & { lat: number; lon: number }) => {
    return gistRepository.create({
      content: overrides.content ?? 'seeded gist',
      lat: overrides.lat,
      lon: overrides.lon,
      location_cell: overrides.location_cell ?? 'seed_cell',
      content_hash: overrides.content_hash ?? `mock_cid_${Math.random().toString(36).slice(2)}`,
      stellar_gist_id: overrides.stellar_gist_id ?? `seed-gist-${Date.now()}-${Math.random()}`,
      tx_hash: overrides.tx_hash ?? `mock_tx_${Date.now()}`,
      author_address: overrides.author_address ?? null,
      expires_at: overrides.expires_at,
    });
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IpfsService)
      .useValue(ipfsMock)
      .overrideProvider(SorobanService)
      .useValue(sorobanMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    gistRepository = moduleFixture.get(GistRepository);
    await prepareTestDatabase(dataSource);
  });

  afterEach(async () => {
    ipfsMock.reset();
    sorobanMock.reset();
    await truncateGistsTable(dataSource);
  });

  afterAll(async () => {
    await truncateGistsTable(dataSource);
    await app.close();
  });

  describe('POST /gists', () => {
    it('creates a gist and returns the API aliases', async () => {
      const res = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({
          content: '<b>great spot</b>',
          lat: 9.0579,
          lon: 7.4951,
          authorAddress: 'GAUTHOR123',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        gist_id: '1',
        tx_hash: expect.stringMatching(/^mock_tx_/),
        content_cid: expect.stringMatching(/^mock_cid_/),
        content: 'great spot',
        author_address: 'GAUTHOR123',
      });
      expect(res.body.content_hash).toBe(res.body.content_cid);
      expect(res.body.stellar_gist_id).toBe(res.body.gist_id);
    });

    it('rejects missing latitude', async () => {
      const res = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({
          content: 'missing lat',
          lon: 7.4951,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('rejects invalid authorAddress', async () => {
      const res = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({
          content: 'bad author',
          lat: 9.0579,
          lon: 7.4951,
          authorAddress: 42,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('rejects content longer than 280 characters', async () => {
      const res = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({
          content: 'x'.repeat(281),
          lat: 9.0579,
          lon: 7.4951,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('GET /gists', () => {
    it('returns gists within radius and orders them by distance', async () => {
      await seedGist({
        content: 'far',
        lat: 9.08,
        lon: 7.52,
        location_cell: 'far',
        content_hash: 'mock_cid_far',
        stellar_gist_id: 'g-far',
      });
      await seedGist({
        content: 'mid',
        lat: 9.066,
        lon: 7.505,
        location_cell: 'mid',
        content_hash: 'mock_cid_mid',
        stellar_gist_id: 'g-mid',
      });
      await seedGist({
        content: 'near',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 'near',
        content_hash: 'mock_cid_near',
        stellar_gist_id: 'g-near',
      });
      await seedGist({
        content: 'outside',
        lat: 9.5,
        lon: 8.1,
        location_cell: 'outside',
        content_hash: 'mock_cid_outside',
        stellar_gist_id: 'g-outside',
      });
      await seedGist({
        content: 'expired',
        lat: 9.058,
        lon: 7.4952,
        location_cell: 'expired',
        content_hash: 'mock_cid_expired',
        stellar_gist_id: 'g-expired',
        expires_at: new Date(Date.now() - 60_000),
      });

      const res = await request(app.getHttpServer())
        .get(API_ROOT)
        .query({ lat: 9.0579, lon: 7.4951, radius: 5000, limit: 10 })
        .expect(200);

      const contents = res.body.data.map((row: { content: string }) => row.content);
      expect(contents).toEqual(['near', 'mid', 'far']);
      expect(res.body.data[0].distance_meters).toBeLessThanOrEqual(res.body.data[1].distance_meters);
      expect(res.body.data[1].distance_meters).toBeLessThanOrEqual(res.body.data[2].distance_meters);
      expect(contents).not.toContain('outside');
      expect(contents).not.toContain('expired');
    });

    it('paginates with a next page cursor', async () => {
      await seedGist({
        content: 'far-page',
        lat: 9.08,
        lon: 7.52,
        location_cell: 'far-page',
        content_hash: 'mock_cid_far_page',
        stellar_gist_id: 'g-far-page',
      });
      await seedGist({
        content: 'mid-page',
        lat: 9.066,
        lon: 7.505,
        location_cell: 'mid-page',
        content_hash: 'mock_cid_mid_page',
        stellar_gist_id: 'g-mid-page',
      });
      await seedGist({
        content: 'near-page',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 'near-page',
        content_hash: 'mock_cid_near_page',
        stellar_gist_id: 'g-near-page',
      });

      const page1 = await request(app.getHttpServer())
        .get(API_ROOT)
        .query({ lat: 9.0579, lon: 7.4951, radius: 5000, limit: 1 })
        .expect(200);

      expect(page1.body.pagination.hasMore).toBe(true);
      expect(page1.body.pagination.cursor).toEqual(expect.any(String));

      const page2 = await request(app.getHttpServer())
        .get(API_ROOT)
        .query({
          lat: 9.0579,
          lon: 7.4951,
          radius: 5000,
          limit: 1,
          cursor: page1.body.pagination.cursor,
        })
        .expect(200);

      expect(page2.body.data[0].content).not.toBe(page1.body.data[0].content);
    });
  });

  describe('GET /gists/:id', () => {
    it('returns the gist by UUID', async () => {
      const created = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({ content: 'lookup me', lat: 9.0579, lon: 7.4951 })
        .expect(201);

      const res = await request(app.getHttpServer()).get(`${API_ROOT}/${created.body.id}`).expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        gist_id: created.body.gist_id,
        content_cid: created.body.content_cid,
        content_hash: created.body.content_hash,
        tx_hash: created.body.tx_hash,
      });
    });

    it('returns 404 for an unknown UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_ROOT}/00000000-0000-0000-0000-000000000000`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('returns 404 for an expired gist', async () => {
      const expired = await seedGist({
        content: 'expired-by-id',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 'expired-by-id',
        content_hash: 'mock_cid_expired_by_id',
        stellar_gist_id: 'g-expired-by-id',
        expires_at: new Date(Date.now() - 60_000),
      });

      const res = await request(app.getHttpServer()).get(`${API_ROOT}/${expired.id}`).expect(404);
      expect(res.body.statusCode).toBe(404);
    });
  });

  describe('GET /gists/:id/content', () => {
    it('returns IPFS content for a gist', async () => {
      const created = await request(app.getHttpServer())
        .post(API_ROOT)
        .send({
          content: 'content route',
          lat: 9.0579,
          lon: 7.4951,
          authorAddress: 'GAUTHCONTENT',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`${API_ROOT}/${created.body.id}/content`)
        .expect(200);

      expect(res.body).toMatchObject({
        content: 'content route',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: expect.any(String),
      });
    });

    it('returns 404 for an unknown gist', async () => {
      await request(app.getHttpServer())
        .get(`${API_ROOT}/00000000-0000-0000-0000-000000000000/content`)
        .expect(404);
    });
  });

  describe('GET /gists/count', () => {
    it('returns the correct count excluding expired gists', async () => {
      await seedGist({
        content: 'count-near',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 'count-near',
        content_hash: 'mock_cid_count_near',
        stellar_gist_id: 'g-count-near',
      });
      await seedGist({
        content: 'count-far',
        lat: 9.08,
        lon: 7.52,
        location_cell: 'count-far',
        content_hash: 'mock_cid_count_far',
        stellar_gist_id: 'g-count-far',
      });
      await seedGist({
        content: 'count-expired',
        lat: 9.0578,
        lon: 7.4952,
        location_cell: 'count-expired',
        content_hash: 'mock_cid_count_expired',
        stellar_gist_id: 'g-count-expired',
        expires_at: new Date(Date.now() - 60_000),
      });

      const res = await request(app.getHttpServer())
        .get(`${API_ROOT}/count`)
        .query({ lat: 9.0579, lon: 7.4951, radius: 5000 })
        .expect(200);

      expect(res.body.count).toBe(2);
      expect(res.body.breakdown).toBeUndefined();
    });
  });

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const res = await request(app.getHttpServer()).get(HEALTH_ROOT).expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.postgis.status).toBe('ok');
    });
  });
});
