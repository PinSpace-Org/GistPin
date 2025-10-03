import { Test, TestingModule } from '@nestjs/testing';
import { FtsoService } from './ftso.service';

describe('FtsoService', () => {
  let service: FtsoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FtsoService],
    }).compile();

    service = module.get<FtsoService>(FtsoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
