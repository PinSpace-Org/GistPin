import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GistsService } from './gists.service';
import { GistRepository, PG_UNIQUE_VIOLATION } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';

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
      countNearby: jest.fn(),
      countNearbyByCell: jest.fn(),
    };

    const ipfsMock = {
      pinJson: jest.fn().mockResolvedValue({ cid: 'Qmrealcid', mock: false }),
      getJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GistsService,
        { provide: DataSource, useValue: { transaction: transactionMock } },
        { provide: GistRepository, useValue: gistRepo },
        { provide: GeoService, useValue: { encode: jest.fn().mockReturnValue('s1t7d8c') } },
        { provide: IpfsService, useValue: ipfsMock },
        {
          provide: SorobanService,
          useValue: { postGist: jest.fn().mockResolvedValue({ gistId: 'gist-1', txHash: 'mock_tx', mock: false }) },
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

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

    it('returns the existing row on SQLSTATE 23505 (stellar_gist_id collision)', async () => {
      const existing = buildGist({ id: 'existing-uuid' });
      const err: Error & { code?: string } = new Error('duplicate key');
      err.code = PG_UNIQUE_VIOLATION;
      gistRepository.create.mockRejectedValue(err);
      gistRepository.findByStellarGistId.mockResolvedValue(existing);

      await expect(service.create(buildDto())).resolves.toBe(existing);
      expect(gistRepository.findByStellarGistId).toHaveBeenCalledWith('gist-1');
    });

    it('rethrows non-23505 errors', async () => {
      const err: Error & { code?: string } = new Error('connection lost');
      err.code = '08006';
      gistRepository.create.mockRejectedValue(err);

      await expect(service.create(buildDto())).rejects.toBe(err);
    });

    it('rethrows 23505 when recovery lookup returns null', async () => {
      const err: Error & { code?: string } = new Error('duplicate key');
      err.code = PG_UNIQUE_VIOLATION;
      gistRepository.create.mockRejectedValue(err);
      gistRepository.findByStellarGistId.mockResolvedValue(null);

      await expect(service.create(buildDto())).rejects.toBe(err);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the gist when found', async () => {
      const gist = buildGist();
      gistRepository.findByGistId.mockResolvedValue(gist);

      await expect(service.findOne(gist.id)).resolves.toBe(gist);
      expect(gistRepository.findByGistId).toHaveBeenCalledWith(gist.id);
    });

    it('throws NotFoundException when repository returns null', async () => {
      gistRepository.findByGistId.mockResolvedValue(null);
      const id = '00000000-0000-0000-0000-000000000000';

      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── getGistContent ────────────────────────────────────────────────────────

  describe('getGistContent', () => {
    const ipfsData = { text: 'hello', lat: 9.0579, lon: 7.4951, timestamp: '2026-01-01T00:00:00Z' };

    it('fetches IPFS content and returns it', async () => {
      gistRepository.findByGistId.mockResolvedValue(buildGist());
      ipfsService.getJson.mockResolvedValue(ipfsData);

      const result = await service.getGistContent(buildGist().id);

      expect(ipfsService.getJson).toHaveBeenCalledWith('Qmrealcid');
      expect(result).toEqual(ipfsData);
    });

    it('returns cached data without calling IPFS again', async () => {
      gistRepository.findByGistId.mockResolvedValue(buildGist());
      ipfsService.getJson.mockResolvedValue(ipfsData);

      await service.getGistContent(buildGist().id);
      await service.getGistContent(buildGist().id);

      expect(ipfsService.getJson).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when gist does not exist', async () => {
      gistRepository.findByGistId.mockResolvedValue(null);

      await expect(service.getGistContent('nonexistent-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadGatewayException when IPFS gateway fails', async () => {
      gistRepository.findByGistId.mockResolvedValue(buildGist());
      ipfsService.getJson.mockRejectedValue(new Error('IPFS fetch failed: 503'));

      await expect(service.getGistContent(buildGist().id)).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('throws NotFoundException when gist has no content_hash', async () => {
      gistRepository.findByGistId.mockResolvedValue(buildGist({ content_hash: null }));

      await expect(service.getGistContent(buildGist().id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
