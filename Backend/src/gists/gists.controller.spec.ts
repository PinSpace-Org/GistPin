import { Test, TestingModule } from '@nestjs/testing';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';
import { Gist } from './entities/gist.entity';

jest.mock('../soroban/soroban.service', () => ({
  SorobanService: class SorobanService {},
}));

// Mock @stellar/stellar-sdk before importing modules that reach it (validators, soroban).
jest.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    isValidEd25519PublicKey: (value: string) =>
      typeof value === 'string' && value.length === 55 && /^G[A-Z2-7]{54}$/.test(value),
  },
}));

/**
 * Unit tests for GistsController response shaping (decorateGist).
 *
 * Issue #1038 — GET /v1/gists/:id must include `is_active` and
 * `report_count` alongside the existing `gist_id`/`content_cid` aliases.
 */
describe('GistsController', () => {
  let controller: GistsController;
  let gistsService: jest.Mocked<Pick<GistsService, 'create' | 'findOne' | 'findNearby'>>;

  const buildGist = (overrides: Partial<Gist> = {}): Gist => ({
    id: '00000000-0000-0000-0000-000000000001',
    content: 'hello',
    location_cell: 's1t7d8c',
    content_hash: 'Qmrealcid',
    stellar_gist_id: 'gist-1',
    tx_hash: 'mock_tx',
    author_address: null,
    location: null,
    is_active: true,
    report_count: 3,
    created_at: new Date('2026-01-01T00:00:00Z'),
    expires_at: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GistsController],
      providers: [
        {
          provide: GistsService,
          useValue: { create: jest.fn(), findOne: jest.fn(), findNearby: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(GistsController);
    gistsService = module.get(GistsService);
  });

  describe('GET /v1/gists/:id response shape', () => {
    it('includes is_active, report_count, gist_id and content_cid', async () => {
      const gist = buildGist({ is_active: false, report_count: 7 });
      gistsService.findOne.mockResolvedValue(gist);

      const result = await controller.findOne(gist.id);

      expect(result).toMatchObject({
        id: gist.id,
        gist_id: 'gist-1',
        content_cid: 'Qmrealcid',
        is_active: false,
        report_count: 7,
      });
    });

    it('keeps the entity fields alongside the aliases', async () => {
      const gist = buildGist();
      gistsService.findOne.mockResolvedValue(gist);

      const result = await controller.findOne(gist.id);

      expect(result).toMatchObject({
        stellar_gist_id: 'gist-1',
        content_hash: 'Qmrealcid',
        is_active: true,
        report_count: 3,
      });
    });
  });

  describe('POST /v1/gists response shape', () => {
    it('includes is_active and report_count on newly created gists', async () => {
      const gist = buildGist();
      gistsService.create.mockResolvedValue(gist);

      const result = await controller.create({} as never);

      expect(result).toMatchObject({
        gist_id: 'gist-1',
        content_cid: 'Qmrealcid',
        is_active: true,
        report_count: 3,
      });
    });
  });

  describe('GET /v1/gists response shape', () => {
    it('includes is_active and report_count on nearby gists', async () => {
      const gist = buildGist();
      gistsService.findNearby.mockResolvedValue({
        data: [gist],
        pagination: { count: 1, cursor: null, hasMore: false },
      });

      const result = await controller.findNearby({} as never);

      expect(result.data[0]).toMatchObject({
        gist_id: 'gist-1',
        is_active: true,
        report_count: 3,
      });
    });
  });
});
