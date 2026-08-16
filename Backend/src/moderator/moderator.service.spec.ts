import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { ModeratorService } from './moderator.service';

/**
 * Unit tests for ModeratorService.
 *
 * Issue #1038 — GET /v1/moderator returns the configured moderator address
 * and fails loudly (503) when none is configured.
 */
describe('ModeratorService', () => {
  let service: ModeratorService;
  let config: { get: jest.Mock };

  const createService = async (address: string): Promise<ModeratorService> => {
    config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'MODERATOR_ADDRESS' ? address : fallback,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ModeratorService, { provide: ConfigService, useValue: config }],
    }).compile();

    return module.get(ModeratorService);
  };

  it('returns the configured moderator address', async () => {
    service = await createService('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN');

    expect(service.getModerator()).toEqual({
      address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    });
  });

  it('reads the address from MODERATOR_ADDRESS', async () => {
    service = await createService('GABC123');

    service.getModerator();

    expect(config.get).toHaveBeenCalledWith('MODERATOR_ADDRESS', '');
  });

  it('throws ServiceUnavailableException when no address is configured', async () => {
    service = await createService('');

    expect(() => service.getModerator()).toThrow(ServiceUnavailableException);
  });
});
