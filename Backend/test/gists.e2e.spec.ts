import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';

describe('Gists (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /gists', () => {
    it('should create a gist and return 201 with full shape', async () => {
      const res = await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'e2e test gist', lat: 9.0579, lon: 7.4951 })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        content: 'e2e test gist',
        location_cell: expect.any(String),
        content_hash: expect.stringContaining('mock_'),
        stellar_gist_id: expect.any(String),
        tx_hash: expect.stringContaining('mock_'),
        created_at: expect.any(String),
        lat: 9.0579,
        lon: 7.4951,
      });
    });

    it('should return 400 when lat is out of range', async () => {
      const res = await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'bad lat', lat: 999, lon: 7.4951 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('lat')]));
    });

    it('should return 400 when content exceeds 280 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'x'.repeat(281), lat: 9.0579, lon: 7.4951 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'missing coords' })
        .expect(400);
    });

    it('should reject unknown fields (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'whitelist test', lat: 9.0579, lon: 7.4951, hack: 'injected' })
        .expect(400);
    });
  });

  describe('GET /gists', () => {
    it('should return paginated response with data and pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/gists')
        .query({ lat: 9.0579, lon: 7.4951, radius: 1000 })
        .expect(200);

      expect(res.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          count: expect.any(Number),
          hasMore: expect.any(Boolean),
        },
      });
    });

    it('should return 400 when lat/lon are missing', async () => {
      await request(app.getHttpServer()).get('/gists').expect(400);
    });

    it('should respect the limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/gists')
        .query({ lat: 9.0579, lon: 7.4951, limit: 2 })
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });  describe('GET /gists/:id', () => {
    it('should return the gist when it exists', async () => {
      const created = await request(app.getHttpServer())
        .post('/gists')
        .send({ content: 'find me by id', lat: 9.0579, lon: 7.4951 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/gists/${created.body.id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        content: 'find me by id',
        location_cell: expect.any(String),
        content_hash: expect.any(String),
        stellar_gist_id: expect.any(String),
        tx_hash: expect.any(String),
        lat: 9.0579,
        lon: 7.4951,
      });
      expect(res.body.created_at).toEqual(expect.any(String));
    });

    it('should return 404 when no gist matches the UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/gists/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toEqual(expect.stringContaining('not found'));
    });

    it('should return 400 when id is not a valid UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/gists/not-a-uuid')
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should return 400 when id contains dangerous characters', async () => {
      // Raw SQL would reject this anyway, but ParseUUIDPipe catches it first.
      const res = await request(app.getHttpServer())
        .get("/gists/'; DROP TABLE gists; --")
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      // Confirm the failure came from UUID validation rather than URL parsing
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/UUID|validation/i)]),
      );
    });
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.services.database.status).toBe('ok');
      expect(res.body.services.postgis.status).toBe('ok');
    });
  });

});
