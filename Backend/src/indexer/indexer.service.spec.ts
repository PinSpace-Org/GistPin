import { Logger } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { SorobanService } from '../soroban/soroban.service';
import { GistRepository } from '../gists/gist.repository';
import { GeoService } from '../geo/geo.service';
import { GistPostedEvent } from '../soroban/soroban.service';
import { IndexerState } from './indexer-state.entity';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

jest.mock('../soroban/soroban.service', () => ({
  SorobanService: class SorobanService {},
}));

function makeEvent(
  overrides: Partial<GistPostedEvent['gist']> = {},
): GistPostedEvent {
  return {
    type: 'gist_posted',
    ledger: 100,
    gist: {
      gistId: 'gist-1',
      locationCell: 'u4pruyd',
      contentHash: 'QmAbc123',
      author: 'GABCD',
      createdAt: 1700000000,
      expiresAt: 1700086400,
      hidden: false,
      ...overrides,
    },
  };
}

// Helper: an existing persisted cursor row, so tests that only care about
// event-processing behavior (not the cursor-seeding behavior) don't need
// to also stub out getLatestLedger.
function existingState(
  lastProcessedLedger: number,
): Partial<IndexerState> {
  return {
    id: 1,
    name: 'gist-indexer',
    lastProcessedLedger,
    updatedAt: new Date(),
  };
}

describe('IndexerService', () => {
  let service: IndexerService;

  let soroban: jest.Mocked<SorobanService>;
  let gistRepo: jest.Mocked<GistRepository>;
  let geoService: jest.Mocked<GeoService>;

  // Keep the mock intentionally small.
  // We only need the repository methods used by IndexerService.
  let indexerStateRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  let logSpy: ReturnType<typeof jest.spyOn>;
  let warnSpy: ReturnType<typeof jest.spyOn>;
  let errorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    soroban = {
      getEventsSince: jest.fn(),
      getLatestLedger: jest.fn(),
    } as unknown as jest.Mocked<SorobanService>;

    soroban.getLatestLedger.mockResolvedValue(1);

    gistRepo = {
      findByStellarGistId: jest.fn(),
      existsByStellarGistId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<GistRepository>;

    geoService = {
      decode: jest.fn().mockReturnValue({
        lat: 48.85,
        lon: 2.35,
      }),
    } as unknown as jest.Mocked<GeoService>;

    indexerStateRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // No persisted cursor on a fresh indexer, by default. Tests that want
    // to skip the seeding path should override this with existingState(...).
    indexerStateRepo.findOne.mockResolvedValue(null as never);

    // Simulate TypeORM create().
    indexerStateRepo.create.mockImplementation(
      (state: Partial<IndexerState>) => state,
    );

    // Simulate TypeORM save().
    indexerStateRepo.save.mockImplementation(
      async (state: Partial<IndexerState>) => state,
    );

    service = new IndexerService(
      soroban,
      gistRepo,
      geoService,
      indexerStateRepo as any,
    );

    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);

    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cursor seeding', () => {
    it('seeds the cursor from the current ledger when none is persisted, instead of defaulting to genesis', async () => {
      // No persisted row (default beforeEach state).
      soroban.getLatestLedger.mockResolvedValue(4219504);
      soroban.getEventsSince.mockResolvedValue([]);

      await service.poll();

      // Soroban RPC rejects startLedger: 0 outright, and genesis replay
      // is explicitly out of scope per the acceptance criteria, so the
      // very first call to getEventsSince must never be seeded with 0.
      expect(soroban.getLatestLedger).toHaveBeenCalled();
      expect(soroban.getEventsSince).toHaveBeenCalledWith(
        4219504,
      );

      // The seeded value must be persisted immediately so a restart
      // resumes from here rather than reseeding to "now" again.
      expect(indexerStateRepo.save).toHaveBeenCalled();

      const savedState = indexerStateRepo.save.mock
        .calls[0][0] as Partial<IndexerState>;

      expect(savedState.name).toBe('gist-indexer');
      expect(savedState.lastProcessedLedger).toBe(4219504);
    });

    it('does not reseed when a cursor is already persisted', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(250) as never,
      );

      soroban.getEventsSince.mockResolvedValue([]);

      await service.poll();

      expect(soroban.getLatestLedger).not.toHaveBeenCalled();
      expect(soroban.getEventsSince).toHaveBeenCalledWith(250);
    });
  });

  describe('poll()', () => {
    it('does nothing when no events are returned', async () => {
      soroban.getEventsSince.mockResolvedValue([]);

      await service.poll();

      // Seeded from the default mocked getLatestLedger() value, not 0.
      expect(soroban.getEventsSince).toHaveBeenCalledWith(1);
      expect(gistRepo.existsByStellarGistId).not.toHaveBeenCalled();
      expect(gistRepo.create).not.toHaveBeenCalled();
    });

    it('loads the persisted cursor before polling', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(250) as never,
      );

      soroban.getEventsSince.mockResolvedValue([]);

      await service.poll();

      expect(soroban.getEventsSince).toHaveBeenCalledWith(250);
    });

    it('persists a new event to the DB', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        makeEvent(),
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
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
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        makeEvent({
          locationCell: 'u4pruyd',
        }),
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(geoService.decode).toHaveBeenCalledWith(
        'u4pruyd',
      );
    });

    it('skips an event that is already indexed', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        makeEvent(),
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(true);

      await service.poll();

      expect(gistRepo.create).not.toHaveBeenCalled();
      expect(indexerStateRepo.save).toHaveBeenCalled();
    });

    it('advances and persists the cursor to the highest event ledger', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      const events = [
        {
          ...makeEvent({ gistId: 'g1' }),
          ledger: 200,
        },
        {
          ...makeEvent({ gistId: 'g2' }),
          ledger: 350,
        },
        {
          ...makeEvent({ gistId: 'g3' }),
          ledger: 275,
        },
      ];

      soroban.getEventsSince.mockResolvedValueOnce(events);
      soroban.getEventsSince.mockResolvedValueOnce([]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(indexerStateRepo.save).toHaveBeenCalled();

      const savedState =
        indexerStateRepo.save.mock.calls[0][0] as Partial<IndexerState>;

      expect(savedState.lastProcessedLedger).toBe(350);

      // Simulate PostgreSQL returning the persisted cursor
      // on the next poll.
      indexerStateRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'gist-indexer',
        lastProcessedLedger: 350,
        updatedAt: new Date(),
      } as never);

      await service.poll();

      expect(soroban.getEventsSince).toHaveBeenNthCalledWith(
        2,
        350,
      );
    });

    it('advances the cursor for already-indexed events', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        {
          ...makeEvent(),
          ledger: 500,
        },
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(true);

      await service.poll();

      const savedState = indexerStateRepo.save.mock.calls[0][0] as Partial<IndexerState>;

      expect(savedState.lastProcessedLedger).toBe(500);
    });

    it('logs the number of events fetched', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        makeEvent(),
        makeEvent({
          gistId: 'g2',
        }),
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await service.poll();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 new event(s)'),
      );
    });

    it('skips a malformed event and continues processing later events', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      const malformedEvent = {
        type: 'gist_posted',
        ledger: 101,
        gist: undefined,
      } as unknown as GistPostedEvent;

      const validEvent = {
        ...makeEvent({
          gistId: 'valid-after-error',
        }),
        ledger: 102,
      };

      soroban.getEventsSince.mockResolvedValue([
        malformedEvent,
        validEvent,
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await expect(
        service.poll(),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalled();

      expect(gistRepo.create).toHaveBeenCalledWith({
        content: '',
        lat: 48.85,
        lon: 2.35,
        location_cell: 'u4pruyd',
        content_hash: 'QmAbc123',
        stellar_gist_id: 'valid-after-error',
        tx_hash: null,
      });

      // The cursor must still advance past the malformed event's ledger,
      // proving one bad event doesn't wedge the loop or hold back
      // subsequent, valid ledgers.
      const savedState = indexerStateRepo.save.mock.calls[0][0] as Partial<IndexerState>;

      expect(savedState.lastProcessedLedger).toBe(102);
    });

    it('continues processing when one event handler fails', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      const firstEvent = {
        ...makeEvent({
          gistId: 'bad-event',
        }),
        ledger: 100,
      };

      const secondEvent = {
        ...makeEvent({
          gistId: 'good-event',
        }),
        ledger: 101,
      };

      soroban.getEventsSince.mockResolvedValue([
        firstEvent,
        secondEvent,
      ]);

      gistRepo.findByStellarGistId
        .mockRejectedValueOnce(
          new Error('Database failure'),
        )
        .mockResolvedValueOnce(null);

      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockResolvedValue({} as never);

      await expect(
        service.poll(),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalled();

      expect(gistRepo.create).toHaveBeenCalledTimes(1);

      expect(gistRepo.create).toHaveBeenCalledWith({
        content: '',
        lat: 48.85,
        lon: 2.35,
        location_cell: 'u4pruyd',
        content_hash: 'QmAbc123',
        stellar_gist_id: 'good-event',
        tx_hash: null,
      });
    });

    it('logs an error and does not throw when Soroban fails', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockRejectedValue(
        new Error('RPC timeout'),
      );

      await expect(
        service.poll(),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        'Indexer poll failed',
        'RPC timeout',
        expect.anything(),
      );
    });

    it('skips a DB write failure and advances the cursor', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      soroban.getEventsSince.mockResolvedValue([
        makeEvent(),
      ]);

      gistRepo.findByStellarGistId.mockResolvedValue(null);
      gistRepo.existsByStellarGistId.mockResolvedValue(false);
      gistRepo.create.mockRejectedValue(
        new Error('DB down'),
      );

      await expect(
        service.poll(),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalled();

      expect(indexerStateRepo.save).toHaveBeenCalled();

      const savedState = indexerStateRepo.save.mock.calls[0][0] as {
        lastProcessedLedger: number;
      };

      expect(savedState.lastProcessedLedger).toBe(100);
    });

    it('does not start another poll while one is already running', async () => {
      indexerStateRepo.findOne.mockResolvedValue(
        existingState(0) as never,
      );

      let resolveEvents:
        | ((events: GistPostedEvent[]) => void)
        | undefined;

      const pendingEvents = new Promise<GistPostedEvent[]>(
        (resolve) => {
          resolveEvents = resolve;
        },
      );

      soroban.getEventsSince.mockReturnValueOnce(
        pendingEvents,
      );

      const firstPoll = service.poll();

      // Wait until the first poll has actually started.
      await new Promise<void>((resolve) => {
        const check = () => {
          if (
            soroban.getEventsSince.mock.calls.length > 0
          ) {
            resolve();
            return;
          }

          setImmediate(check);
        };

        check();
      });

      const secondPoll = service.poll();

      await secondPoll;

      expect(
        soroban.getEventsSince,
      ).toHaveBeenCalledTimes(1);

      resolveEvents?.([]);

      await firstPoll;
    });
  });
});