import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GistsService } from './gists.service';
import { GistRepository } from './gist.repository';
import { GeoService } from '../geo/geo.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { SorobanService } from '../soroban/soroban.service';
import { Gist } from './entities/gist.entity';

describe('GistsService', () => {
  let service: GistsService;
  let gistRepository: jest.Mocked<GistRepository>;

  const fakeGist: Gist = {
    id: '11111111-1111-4111-8111-111111111111',
    content: 'hello world',
    location_cell: 's1t7d8c',
    content_hash: 'mock_cid',
    stellar_gist_id: 'stellar-abc-123',
    tx_hash: 'mock_tx',
    location: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GistsService,
        {
          provide: GistRepository,
          useValue: {
            findByGistId: jest.fn(),
            create: jest.fn(),
            findNearby: jest.fn(),
          },
        },
        // `findOne` does not touch these dependencies, but the constructor
        // requires them. Use minimal stubs to satisfy DI.
        { provide: GeoService, useValue: {} },
        { provide: IpfsService, useValue: {} },
        { provide: SorobanService, useValue: {} },
      ],
    }).compile();

    service = module.get<GistsService>(GistsService);
    gistRepository = module.get(GistRepository);
  });

  describe('findOne', () => {
    // Issue 96 — return 404 when no gist matches the UUID
    it('should return the gist when the repository finds it', async () => {
      gistRepository.findByGistId.mockResolvedValue(fakeGist);

      await expect(service.findOne(fakeGist.id)).resolves.toEqual(fakeGist);
      expect(gistRepository.findByGistId).toHaveBeenCalledWith(fakeGist.id);
    });

    it('should throw NotFoundException when the repository returns null', async () => {
      const id = '00000000-0000-0000-0000-000000000000';
      gistRepository.findByGistId.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Gist with ID ${id} not found`,
      );
      expect(gistRepository.findByGistId).toHaveBeenCalledWith(id);
    });
  });
});
