import { IndexerService } from './indexer.service';
import { SorobanService } from '../soroban/soroban.service';
import { GistRepository } from '../gists/gist.repository';
import { GeoService } from '../geo/geo.service';
import { IndexerState } from './indexer-state.entity';
import { Repository } from 'typeorm';

describe('Contract-Indexer Integration Flow (integration)', () => {
  let indexerService: IndexerService;
  let sorobanService: jest.Mocked<SorobanService>;
  let gistRepository: jest.Mocked<GistRepository>;
  let geoService: jest.Mocked<GeoService>;
  let indexerStateRepo: jest.Mocked<Repository<IndexerState>>;

  const store = new Map<string, any>();

  beforeEach(() => {
    store.clear();

    sorobanService = {
      getEventsSince: jest.fn(),
      getLatestLedger: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<SorobanService>;

    gistRepository = {
      findByStellarGistId: jest.fn(),
      existsByStellarGistId: jest.fn(),
      create: jest.fn(async (data: any) => {
        const item = {
          id: `uuid-${data.stellar_gist_id}`,
          content: data.content,
          location_cell: data.location_cell,
          content_hash: data.content_hash,
          stellar_gist_id: data.stellar_gist_id,
          tx_hash: data.tx_hash,
          author_address: data.author_address ?? null,
          created_at: new Date(),
          expires_at: data.expires_at ?? new Date(Date.now() + 86400000),
          hidden: false,
          report_count: 0,
          is_active: true,
        };
        store.set(data.stellar_gist_id, item);
        return item;
      }),
      updateContentHash: jest.fn(async (id: string, hash: string) => {
        const item = store.get(id);
        if (item) {
          item.content_hash = hash;
          return true;
        }
        return false;
      }),
      setGistActive: jest.fn(async (id: string, active: boolean) => {
        const item = store.get(id);
        if (item) {
          item.is_active = active;
          return true;
        }
        return false;
      }),
      setGistHidden: jest.fn(async (id: string, hidden: boolean) => {
        const item = store.get(id);
        if (item) {
          item.hidden = hidden;
          return true;
        }
        return false;
      }),
      updateReportCount: jest.fn(async (id: string, count: number) => {
        const item = store.get(id);
        if (item) {
          item.report_count = count;
          return true;
        }
        return false;
      }),
    } as unknown as jest.Mocked<GistRepository>;

    geoService = {
      decode: jest.fn().mockReturnValue({ lat: 6.5244, lon: 3.3792 }),
    } as unknown as jest.Mocked<GeoService>;

    indexerStateRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<IndexerState>>;

    indexerStateRepo.findOne.mockResolvedValue(null as never);
    indexerStateRepo.create.mockImplementation((state: Partial<IndexerState>) => state as any);
    indexerStateRepo.save.mockImplementation(async (state: Partial<IndexerState>) => state as any);

    indexerService = new IndexerService(
      sorobanService,
      gistRepository,
      geoService,
      indexerStateRepo as any,
    );
  });

  it('indexes a gist_posted event into the store', async () => {
    const stellarGistId = 'gist-1042';

    gistRepository.findByStellarGistId.mockResolvedValue(null);
    sorobanService.getEventsSince.mockImplementation(async () => [
      {
        type: 'gist_posted',
        ledger: 100,
        gist: {
          gistId: stellarGistId,
          locationCell: 's1t7d8c',
          contentHash: 'QmInitialCid',
          author: null,
          createdAt: 1700000000,
          expiresAt: 1700086400,
          hidden: false,
        },
      },
    ]);

    await indexerService.poll();
    expect(gistRepository.create).toHaveBeenCalledTimes(1);
    expect(store.get(stellarGistId)).toMatchObject({
      content_hash: 'QmInitialCid',
      is_active: true,
    });
  });

  it('skips an already-indexed gist', async () => {
    const stellarGistId = 'gist-1042';

    gistRepository.existsByStellarGistId.mockResolvedValue(true);
    sorobanService.getEventsSince.mockImplementation(async () => [
      {
        type: 'gist_posted',
        ledger: 100,
        gist: {
          gistId: stellarGistId,
          locationCell: 's1t7d8c',
          contentHash: 'QmDuplicate',
          author: null,
          createdAt: 1700000000,
          expiresAt: 1700086400,
          hidden: false,
        },
      },
    ]);

    await indexerService.poll();
    expect(gistRepository.create).not.toHaveBeenCalled();
  });
});
