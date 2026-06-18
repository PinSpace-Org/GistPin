import { Logger } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { SorobanService } from '../soroban/soroban.service';
import { GistRepository } from '../gists/gist.repository';
import { GeoService } from '../geo/geo.service';
import { GistEvent } from '../soroban/soroban.service';

function makeEvent(overrides: Partial<GistEvent> = {}): GistEvent {
  return {
    gistId: 'gist-1',
    locationCell: 'u4pruyd',
    contentHash: 'QmAbc123',
    author: 'GABCD',
    ledger: 100,
    createdAt: 1700000000,
    ...overrides,
  };
}

describe('IndexerService', () => {
  let service: IndexerService;
  let soroban: jest.Mocked<SorobanService>;
  let gistRepo: jest.Mocked<GistRepository>;
  let geoService: jest.Mocked<GeoService>;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    soroban = {
      getEventsSince: jest.fn(),
    } as unknown as jest.Mocked<SorobanService>;

    gistRepo = {
      existsByStellarGistId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<GistRepository>;

    geoService = {
      decode: jest.fn().mockReturnValue({ lat: 48.85, lon: 2.35 }),
    } as unknown as jest.Mocked<GeoService>;

    service = new IndexerService(soroban, gistRepo, geoService);

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('poll()', () => {
    it('does nothing when no events are returned', async () => {
      soroban.getEventsSince.mockResolvedValue([]);
      await service.poll();
      expect(gistRepo.existsByStellarGistId).not.toHaveBeenCalled();
      expect(gistRepo.create).not.toHaveBeenCalled();
    });

    it('persists a new event to the DB', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent()]);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(gistRepo.create).toHaveBeenCalledWith({
        content: '',
        lat: 48.85,
        lon: 2.35,
        location_cell: 'u4pruyd',
        content_hash: 'QmAbc123',
        stellar_gist_id: 'gist-1',
        tx_hash: null,
      });
    });

    it('decodes the locationCell via GeoService', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent({ locationCell: 'u4pruyd' })]);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(geoService.decode).toHaveBeenCalledWith('u4pruyd');
    });

    it('skips an event that is already indexed', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent()]);
      gistRepo.existsByStellarGistId.mockResolvedValue(true);

      await service.poll();

      expect(gistRepo.create).not.toHaveBeenCalled();
    });

    it('advances lastProcessedLedger to the highest event ledger', async () => {
      const events = [
        makeEvent({ gistId: 'g1', ledger: 200 }),
        makeEvent({ gistId: 'g2', ledger: 350 }),
        makeEvent({ gistId: 'g3', ledger: 275 }),
      ];
      soroban.getEventsSince.mockResolvedValue(events);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();
      // A second poll should query from ledger 350
      soroban.getEventsSince.mockResolvedValue([]);
      await service.poll();

      expect(soroban.getEventsSince).toHaveBeenNthCalledWith(2, 350);
    });

    it('also advances lastProcessedLedger for already-indexed events', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent({ ledger: 500 })]);
      gistRepo.existsByStellarGistId.mockResolvedValue(true);

      await service.poll();
      soroban.getEventsSince.mockResolvedValue([]);
      await service.poll();

      expect(soroban.getEventsSince).toHaveBeenNthCalledWith(2, 500);
    });

    it('logs the number of events fetched', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent(), makeEvent({ gistId: 'g2' })]);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2 new event(s)'));
    });

    it('logs an error and does not throw when soroban fails', async () => {
      soroban.getEventsSince.mockRejectedValue(new Error('RPC timeout'));

      await expect(service.poll()).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        'Indexer poll failed',
        'RPC timeout',
        expect.anything(),
      );
    });

    it('logs an error and does not throw when DB write fails', async () => {
      soroban.getEventsSince.mockResolvedValue([makeEvent()]);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockRejectedValue(new Error('DB down'));

      await expect(service.poll()).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy()', () => {
    it('clears the poll interval', () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');
      service.startPolling(99999);
      service.onModuleDestroy();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('does not throw when called before startPolling', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
