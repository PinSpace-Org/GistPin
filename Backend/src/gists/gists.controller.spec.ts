import { Test, TestingModule } from '@nestjs/testing';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';

describe('GistsController', () => {
  let controller: GistsController;
  let service: jest.Mocked<GistsService>;

  const mockGist = {
    id: '00000000-0000-0000-0000-000000000001',
    content: 'hello',
    location_cell: 's1t7d8c',
    content_hash: 'Qmrealcid',
    stellar_gist_id: '123',
    tx_hash: 'tx123',
    author_address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    location: 'POINT(7.4951 9.0579)',
    created_at: new Date(),
    expires_at: new Date(),
    hidden: false,
    report_count: 2,
    is_active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GistsController],
      providers: [
        {
          provide: GistsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockGist),
            findNearby: jest.fn().mockResolvedValue({ data: [mockGist], total: 1 }),
            findOne: jest.fn().mockResolvedValue(mockGist),
            getContent: jest.fn().mockResolvedValue({ content: 'hello' }),
            countNearby: jest.fn().mockResolvedValue({ count: 1 }),
            report: jest.fn().mockResolvedValue({ count: 1 }),
            getModerator: jest
              .fn()
              .mockResolvedValue({ moderatorAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' }),
          },
        },
      ],
    }).compile();

    controller = module.get<GistsController>(GistsController);
    service = module.get(GistsService);
  });

  it('findOne decorates gist with is_active, report_count, gist_id, content_cid', async () => {
    const res = await controller.findOne('00000000-0000-0000-0000-000000000001');
    expect(res).toMatchObject({
      gist_id: '123',
      content_cid: 'Qmrealcid',
      is_active: true,
      report_count: 2,
    });
  });

  it('getModerator returns current moderator address', async () => {
    const res = await controller.getModerator();
    expect(res).toEqual({
      moderatorAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    });
    expect(service.getModerator).toHaveBeenCalledTimes(1);
  });
});
