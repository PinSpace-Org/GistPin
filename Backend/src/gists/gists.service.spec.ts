import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GistsService } from './gists.service';
import { GistRepository, PG_UNIQUE_VIOLATION } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';

/**
 * Issue #98 — unit tests for transactional gist creation.
 *
 * These are pure unit tests: real TypeORM / Postgres is not required.
 * We mock the dataSource.transaction() call to simulate the
 * atomic-rollback contract and assert SQLSTATE 23505 idempotency.
 */
describe('GistsService', () => {
  let service: GistsService;
  let gistRepository: jest.Mocked<GistRepository>;
  let transactionMock: jest.Mock;

  const buildGist = (overrides: Partial<Gist> = {}): Gist => ({
    id: '00000000-0000-0000-0000-000000000001',
    content: 'hello',
    location_cell: 's1t7d8c',
    content_hash: 'mock_cid',
    stellar_gist_id: 'gist-1',
    tx_hash: 'mock_tx',
    location: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  const buildDto = () => ({
    content: '<b>hello</b>',
    lat: 9.0579,
    lon: 7.4951,
    author: 'GAUTH',
  });

  beforeEach(async () => {
    transactionMock = jest.fn(async (cb: (manager: unknown) => unknown) => cb({}));

    const gistRepo = {
      create: jest.fn(),
      findByGistId: jest.fn(),
      findByStellarGistId: jest.fn(),
      existsByStellarGistId: jest.fn(),
      findNearby: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GistsService,
        { provide: DataSource, useValue: { transaction: transactionMock } },
        { provide: GistRepository, useValue: gistRepo },
        {
          provide: GeoService,
          useValue: { encode: jest.fn().mockReturnValue('s1t7d8c') },
        },
        {
          provide: IpfsService,
          useValue: { pinJson: jest.fn().mockResolvedValue({ cid: 'mock_cid', mock: true }) },
        },
        {
          provide: SorobanService,
          useValue: {
            postGist: jest.fn().mockResolvedValue({
              gistId: 'gist-1',
              txHash: 'mock_tx',
              mock: true,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(GistsService);
    gistRepository = module.get(GistRepository) as jest.Mocked<GistRepository>;

    // Silence noisy logger output during the test run.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('sanitizes content, encodes the cell, pins IPFS, posts Soroban, and inserts in a transaction', async () => {
      const created = buildGist();
      gistRepository.create.mockResolvedValue(created);

      const result = await service.create(buildDto());

      // Wrapped in a TypeORM-style dataSource.transaction() boundary
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(gistRepository.create).toHaveBeenCalledTimes(1);
      const writeArgs = gistRepository.create.mock.calls[0];
      expect(writeArgs[0]).toMatchObject({
        content: 'hello',
        lat: 9.0579,
        lon: 7.4951,
        location_cell: 's1t7d8c',
        content_hash: 'mock_cid',
        stellar_gist_id: 'gist-1',
        tx_hash: 'mock_tx',
      });
      // Second arg must be the manager handed back by the transaction callback
      expect(writeArgs[1]).toEqual({});

      expect(result).toBe(created);
    });

    it('returns the existing gist when the INSERT collides on stellar_gist_id (SQLSTATE 23505)', async () => {
      const existing = buildGist({ id: 'existing-uuid', stellar_gist_id: 'gist-1' });
      const driverError: Error & { code?: string } = new Error('duplicate key value');
      driverError.code = PG_UNIQUE_VIOLATION;

      gistRepository.create.mockRejectedValue(driverError);
      gistRepository.findByStellarGistId.mockResolvedValue(existing);

      const result = await service.create(buildDto());

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(gistRepository.create).toHaveBeenCalledTimes(1);
      expect(gistRepository.findByStellarGistId).toHaveBeenCalledWith('gist-1');
      expect(result).toBe(existing);
    });

    it('throws when the INSERT fails with a non-23505 error', async () => {
      const driverError: Error & { code?: string } = new Error('connection lost');
      driverError.code = '08006'; // connection failure

      gistRepository.create.mockRejectedValue(driverError);

      await expect(service.create(buildDto())).rejects.toBe(driverError);

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(gistRepository.findByStellarGistId).not.toHaveBeenCalled();
    });

    it('rethrows if the idempotent recovery lookup returns null', async () => {
      const driverError: Error & { code?: string } = new Error('duplicate key value');
      driverError.code = PG_UNIQUE_VIOLATION;

      gistRepository.create.mockRejectedValue(driverError);
      // Stranger scenario: 23505 raised but the row cannot be found afterwards
      gistRepository.findByStellarGistId.mockResolvedValue(null);

      await expect(service.create(buildDto())).rejects.toBe(driverError);
    });
  });
});
