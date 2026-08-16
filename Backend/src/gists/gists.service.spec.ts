import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GistsService } from './gists.service';
import { GistRepository, PG_UNIQUE_VIOLATION } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';

jest.mock('../soroban/soroban.service', () => ({
  SorobanService: class SorobanService {
    postGist = jest.fn();
    getGist = jest.fn();
    getEventsSince = jest.fn();
    reportGist = jest.fn().mockResolvedValue(1);
    getModerator = jest.fn().mockResolvedValue(null);
  },
}));

/**
 * Unit tests for GistsService.
 *
 * Issue #98  — transactional gist creation and SQLSTATE 23505 idempotency.
 * Issue #604 — TTL/expiry: expires_at is set correctly from ttlHours.
 */
describe('GistsService', () => {
  let service: GistsService;
  let gistRepository: jest.Mocked<GistRepository>;
  let ipfsService: jest.Mocked<IpfsService>;
  let transactionMock: jest.Mock;

  const buildGist = (overrides: Partial<Gist> = {}): Gist => ({
    id: '00000000-0000-0000-0000-000000000001',
    content: 'hello',
    location_cell: 's1t7d8c',
    content_hash: 'Qmrealcid',
    stellar_gist_id: 'gist-1',
    tx_hash: 'mock_tx',
    author_address: null,
    location: null,
    hidden: false,
    report_count: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    expires_at: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });

  const buildDto = (overrides: Record<string, unknown> = {}) => ({
    content: '<b>hello</b>',
    lat: 9.0579,
    lon: 7.4951,
    author: 'GAUTH',
    ...overrides,
  });

  beforeEach(async () => {
    transactionMock = jest.fn(async (cb: (manager: unknown) => unknown) => cb({}));

    const gistRepo = {
      create: jest.fn(),
      findByGistId: jest.fn(),
      findByStellarGistId: jest.fn(),
      existsByStellarGistId: jest.fn(),
      findNearby: jest.fn(),
      countNearby: jest.fn(),
      countNearbyByCell: jest.fn(),
      deleteExpired: jest.fn(),
      incrementReportCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GistsService,
        { provide: DataSource, useValue: { transaction: transactionMock } },
        { provide: GistRepository, useValue: gistRepo },
        { provide: GeoService, useValue: { encode: jest.fn().mockReturnValue('s1t7d8c') } },
        { provide: IpfsService, useValue: { pinJson: jest.fn().mockResolvedValue({ cid: 'Qmrealcid' }) } },
        {
          provide: SorobanService,
          useValue: {
            postGist: jest.fn().mockResolvedValue({ gistId: 'gist-1', txHash: 'mock_tx' }),
            reportGist: jest.fn().mockResolvedValue(1),
            getModerator: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get(GistsService);
    gistRepository = module.get(GistRepository) as jest.Mocked<GistRepository>;
    ipfsService = module.get(IpfsService) as jest.Mocked<IpfsService>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('sanitizes, encodes, pins IPFS, posts Soroban, and inserts in a transaction', async () => {
      const created = buildGist();
      gistRepository.create.mockResolvedValue(created);

      const result = await service.create(buildDto());

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(gistRepository.create).toHaveBeenCalledTimes(1);
      const [writeArg, managerArg] = gistRepository.create.mock.calls[0];
      expect(writeArg).toMatchObject({
        content: 'hello',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 's1t7d8c',
        content_hash: 'Qmrealcid',
        stellar_gist_id: 'gist-1',
        tx_hash: 'mock_tx',
      });
      expect(managerArg).toEqual({});
      expect(result).toBe(created);
    });

    // Issue #604 — expires_at is set based on ttlHours
    it('sets expires_at ~24 h from now when ttlHours is not provided', async () => {
      const before = Date.now();
      gistRepository.create.mockResolvedValue(buildGist());

      await service.create(buildDto());

      const after = Date.now();
      const expiresAt: Date = gistRepository.create.mock.calls[0][0].expires_at as Date;
      expect(expiresAt).toBeInstanceOf(Date);
      const delta = expiresAt.getTime() - before;
      // Should be 24 h ± a few ms
      expect(delta).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 100);
      expect(delta).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + (after - before) + 100);
    });

    it('sets expires_at ~2 h from now when ttlHours is 2', async () => {
      const before = Date.now();
      gistRepository.create.mockResolvedValue(buildGist());

      await service.create(buildDto({ ttlHours: 2 }));

      const after = Date.now();
      const expiresAt: Date = gistRepository.create.mock.calls[0][0].expires_at as Date;
      const delta = expiresAt.getTime() - before;
      expect(delta).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000 - 100);
      expect(delta).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + (after - before) + 100);
    });

    it('returns the existing gist when the INSERT collides on stellar_gist_id (SQLSTATE 23505)', async () => {
      const existing = buildGist({ id: 'existing-uuid', stellar_gist_id: 'gist-1' });
      const driverError: Error & { code?: string } = new Error('duplicate key value');
      driverError.code = PG_UNIQUE_VIOLATION;

      gistRepository.create.mockRejectedValue(driverError);
      gistRepository.findByStellarGistId.mockResolvedValue(existing);

      const result = await service.create(buildDto());

      expect(gistRepository.findByStellarGistId).toHaveBeenCalledWith('gist-1');
    });

    it('throws when the INSERT fails with a non-23505 error', async () => {
      const driverError: Error & { code?: string } = new Error('connection lost');
      driverError.code = '08006';

      gistRepository.create.mockRejectedValue(driverError);
      gistRepository.findByStellarGistId.mockResolvedValue(null);

      await expect(service.create(buildDto())).rejects.toBe(driverError);
      expect(gistRepository.findByStellarGistId).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findOne
  // ──────────────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return the gist when the repository finds it', async () => {
      const gist = buildGist();
      gistRepository.findByGistId.mockResolvedValue(gist);

      await expect(service.findOne(gist.id)).resolves.toEqual(gist);
      expect(gistRepository.findByGistId).toHaveBeenCalledWith(gist.id);
    });

    it('should throw NotFoundException when the repository returns null (expired or missing)', async () => {
      const id = '00000000-0000-0000-0000-000000000000';
      gistRepository.findByGistId.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(`Gist with ID ${id} not found`);
    });
  });

  describe('reportGist', () => {
    it('increments report_count and returns new count', async () => {
      const gist = buildGist({ report_count: 2, stellar_gist_id: 'gist-1' });
      gistRepository.findByGistId.mockResolvedValue(gist);
      (gistRepository as any).incrementReportCount = jest.fn().mockResolvedValue(3);

      const result = await service.reportGist(gist.id);

      expect((gistRepository as any).incrementReportCount).toHaveBeenCalledWith(gist.id);
      expect(result).toEqual({ report_count: 3 });
    });

    it('throws NotFoundException when gist does not exist', async () => {
      gistRepository.findByGistId.mockResolvedValue(null);

      await expect(service.reportGist('non-existent-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('still increments DB count when on-chain call fails', async () => {
      const gist = buildGist({ report_count: 0, stellar_gist_id: 'gist-99' });
      gistRepository.findByGistId.mockResolvedValue(gist);
      (gistRepository as any).incrementReportCount = jest.fn().mockResolvedValue(1);
      // Simulate soroban failure
      const sorobanSpy = jest
        .spyOn(service['sorobanService'] as any, 'reportGist')
        .mockRejectedValue(new Error('network error'));

      const result = await service.reportGist(gist.id);

      expect(sorobanSpy).toHaveBeenCalled();
      expect(result).toEqual({ report_count: 1 });
    });
  });

  describe('getModerator', () => {
    it('returns the moderator address when available', async () => {
      jest.spyOn(service['sorobanService'] as any, 'getModerator').mockResolvedValue('GADMIN123');

      const result = await service.getModerator();

      expect(result).toEqual({ moderator: 'GADMIN123' });
    });

    it('returns null when contract is not initialized', async () => {
      jest.spyOn(service['sorobanService'] as any, 'getModerator').mockResolvedValue(null);

      const result = await service.getModerator();

      expect(result).toEqual({ moderator: null });
    });
  });
});

