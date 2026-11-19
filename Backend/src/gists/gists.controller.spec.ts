import { BadRequestException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GistsController } from './gists.controller';
import { CreateGistDto } from './dto/create-gist.dto';
import { QueryGistsDto } from './dto/query-gists.dto';
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
            getModerator: jest.fn().mockResolvedValue({
              moderatorAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
            }),
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

  const GIST_ID = '00000000-0000-0000-0000-000000000001';

  describe('create', () => {
    it('passes the dto to the service and decorates the created gist', async () => {
      const dto = { content: 'hello', lat: 9.0579, lon: 7.4951 } as CreateGistDto;

      const res = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(res).toMatchObject({ id: mockGist.id, gist_id: '123', content_cid: 'Qmrealcid' });
    });

    it('propagates a service failure', async () => {
      service.create.mockRejectedValueOnce(new Error('ipfs down'));

      await expect(controller.create({} as CreateGistDto)).rejects.toThrow('ipfs down');
    });
  });

  describe('findNearby', () => {
    it('decorates every gist in the paginated response and keeps the other fields', async () => {
      const query = { lat: 9.0579, lon: 7.4951 } as QueryGistsDto;

      const res = await controller.findNearby(query);

      expect(service.findNearby).toHaveBeenCalledWith(query);
      expect(res).toMatchObject({ total: 1 });
      expect(res.data[0]).toMatchObject({ gist_id: '123', content_cid: 'Qmrealcid' });
    });

    it('propagates a service failure', async () => {
      service.findNearby.mockRejectedValueOnce(new Error('db down'));

      await expect(controller.findNearby({} as QueryGistsDto)).rejects.toThrow('db down');
    });
  });

  describe('countNearby', () => {
    it('returns the service result for the query', async () => {
      const query = { lat: 9.0579, lon: 7.4951 } as QueryGistsDto;

      await expect(controller.countNearby(query)).resolves.toEqual({ count: 1 });
      expect(service.countNearby).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('maps a missing gist to a 404', async () => {
      service.findOne.mockRejectedValueOnce(new NotFoundException('Gist not found'));

      await expect(controller.findOne(GIST_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findContent', () => {
    it('returns the IPFS content for the gist id', async () => {
      await expect(controller.findContent(GIST_ID)).resolves.toEqual({ content: 'hello' });
      expect(service.getContent).toHaveBeenCalledWith(GIST_ID);
    });

    it('maps a missing gist or missing content to a 404', async () => {
      service.getContent.mockRejectedValueOnce(new NotFoundException('Content not found'));

      await expect(controller.findContent(GIST_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a non-UUID id at the route pipe before reaching the service', async () => {
      await expect(
        new ParseUUIDPipe().transform('not-a-uuid', { type: 'param', data: 'id' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(service.getContent).not.toHaveBeenCalled();
    });
  });

  describe('report', () => {
    it('reports the gist and returns the new report count', async () => {
      await expect(controller.report(GIST_ID)).resolves.toEqual({ count: 1 });
      expect(service.report).toHaveBeenCalledWith(GIST_ID);
    });

    it('maps an unknown gist to a 404', async () => {
      service.report.mockRejectedValueOnce(new NotFoundException('Gist not found'));

      await expect(controller.report(GIST_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getModerator failure', () => {
    it('propagates a failure from the chain lookup', async () => {
      service.getModerator.mockRejectedValueOnce(new Error('rpc unreachable'));

      await expect(controller.getModerator()).rejects.toThrow('rpc unreachable');
    });
  });
});
