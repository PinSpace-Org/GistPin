import { Test, TestingModule } from '@nestjs/testing';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';

describe('GistsController', () => {
  let controller: GistsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GistsController],
      providers: [GistsService],
    }).compile();

    controller = module.get<GistsController>(GistsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
