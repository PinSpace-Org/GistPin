import { Test, TestingModule } from '@nestjs/testing';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';
import { Gist } from './entities/gist.entity';

describe('GistsController', () => {
  let controller: GistsController;
  let service: jest.Mocked<GistsService>;

  const mockGist: Gist = {
    id: '00000000-0000-0000-0000-000000000001',
    content: 'hello world',
    location_cell: 'cell-1',
    content_hash: 'Qmhash1',
    stellar_gist_id: 'gist-10',
    tx_hash: 'tx-10',
    author_address: 'GAUTHOR',
    location: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    hidden: false,
    report_count: 0,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findNearby: jest.fn(),
      countNearby: jest.fn(),
      findOne: jest.fn(),
      getContent: jest.fn(),
      report: jest.fn(),
      getModerator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GistsController],
      providers: [{ provide: GistsService, useValue: mockService }],
    }).compile();

    controller = module.get<GistsController>(GistsController);
    service = module.get(GistsService) as jest.Mocked<GistsService>;
  });

  describe('findOne', () => {
    it('decorates gist with is_active and report_count', async () => {
      service.findOne.mockResolvedValue(mockGist);

      const result = await controller.findOne(mockGist.id);

      expect(service.findOne).toHaveBeenCalledWith(mockGist.id);
      expect(result).toMatchObject({
        id: mockGist.id,
        gist_id: 'gist-10',
        content_cid: 'Qmhash1',
        is_active: true,
        report_count: 0,
      });
    });

    it('sets is_active false when expired', async () => {
      const expiredGist: Gist = {
        ...mockGist,
        expires_at: new Date(Date.now() - 10000),
      };
      service.findOne.mockResolvedValue(expiredGist);

      const result = await controller.findOne(expiredGist.id);
      expect(result.is_active).toBe(false);
    });

    it('sets is_active false when hidden', async () => {
      const hiddenGist: Gist = {
        ...mockGist,
        hidden: true,
      };
      service.findOne.mockResolvedValue(hiddenGist);

      const result = await controller.findOne(hiddenGist.id);
      expect(result.is_active).toBe(false);
    });
  });

  describe('getModerator', () => {
    it('returns moderator address from service', async () => {
      const modObj = { moderator: 'GBFNWEU3OM7QT7Y7UAZU6FHLSJIISTT3MSPBICAK4FSBIF5YL4W6IDCK' };
      service.getModerator.mockResolvedValue(modObj);

      const result = await controller.getModerator();
      expect(result).toEqual(modObj);
      expect(service.getModerator).toHaveBeenCalled();
    });
  });
});
