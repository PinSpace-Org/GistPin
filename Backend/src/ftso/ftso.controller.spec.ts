import { Test, TestingModule } from '@nestjs/testing';
import { FtsoController } from './ftso.controller';
import { FtsoService } from './ftso.service';

describe('FtsoController', () => {
  let controller: FtsoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FtsoController],
      providers: [FtsoService],
    }).compile();

    controller = module.get<FtsoController>(FtsoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
