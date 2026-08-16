import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ModeratorController } from './moderator.controller';
import { ModeratorService } from './moderator.service';

/**
 * Unit tests for ModeratorController.
 *
 * Issue #1038 — GET /v1/moderator delegates to ModeratorService and returns
 * its response (or the 503 when the address is unconfigured).
 */
describe('ModeratorController', () => {
  let controller: ModeratorController;
  let moderatorService: jest.Mocked<ModeratorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModeratorController],
      providers: [{ provide: ModeratorService, useValue: { getModerator: jest.fn() } }],
    }).compile();

    controller = module.get(ModeratorController);
    moderatorService = module.get(ModeratorService);
  });

  it('returns the moderator address from the service', () => {
    moderatorService.getModerator.mockReturnValue({ address: 'GABC123' });

    expect(controller.getModerator()).toEqual({ address: 'GABC123' });
  });

  it('propagates ServiceUnavailableException when the address is unconfigured', () => {
    moderatorService.getModerator.mockImplementation(() => {
      throw new ServiceUnavailableException('Moderator address is not configured');
    });

    expect(() => controller.getModerator()).toThrow(ServiceUnavailableException);
  });
});
