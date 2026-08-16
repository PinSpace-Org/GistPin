import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GistsController } from './gists.controller';
import { GistsService } from './gists.service';

jest.mock('../soroban/soroban.service', () => ({
  SorobanService: class SorobanService {},
}));

// Mock @stellar/stellar-sdk before importing modules that reach it (validators, soroban).
jest.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    isValidEd25519PublicKey: (value: string) =>
      typeof value === 'string' && value.length === 55 && /^G[A-Z2-7]{54}$/.test(value),
  },
}));

/**
 * Unit tests for the POST /v1/gists/:id/report route (issue #1039).
 */
describe('GistsController', () => {
  let controller: GistsController;
  let gistsService: jest.Mocked<Pick<GistsService, 'report'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GistsController],
      providers: [
        {
          provide: GistsService,
          useValue: { report: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(GistsController);
    gistsService = module.get(GistsService);
  });

  describe('POST /v1/gists/:id/report', () => {
    it('returns the on-chain id and the new report count', async () => {
      gistsService.report.mockResolvedValue({ gist_id: 'gist-1', report_count: 4 });

      const result = await controller.report('00000000-0000-0000-0000-000000000001');

      expect(gistsService.report).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
      expect(result).toEqual({ gist_id: 'gist-1', report_count: 4 });
    });

    it('propagates NotFoundException from the service', async () => {
      gistsService.report.mockRejectedValue(
        new NotFoundException('Gist with ID x not found'),
      );

      await expect(
        controller.report('00000000-0000-0000-0000-000000000001'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('applies the throttler limit to the report route', () => {
      const target = GistsController.prototype.report;
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', target)).toBe(10);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', target)).toBe(60000);
    });
  });
});
