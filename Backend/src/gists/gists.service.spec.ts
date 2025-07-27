import { Test, TestingModule } from '@nestjs/testing';
import { GistsService } from './gists.service';

describe('GistsService', () => {
  let service: GistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GistsService],
    }).compile();

    service = module.get<GistsService>(GistsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
