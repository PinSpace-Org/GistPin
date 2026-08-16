jest.mock('@stellar/stellar-sdk', () => {
  const noop = () => {};
  return {
    StrKey: { encodeEd25519PublicKey: jest.fn((k: string) => k) },
    Address: jest.fn().mockImplementation((k: string) => ({ toString: () => k })),
    BASE_FEE: '100',
    Networks: { TESTNET: 'Public Global Stellar Network ; September 2015' },
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue({}),
    })),
    Memo: { text: jest.fn((t: string) => ({ _type: 'text', _value: t })) },
    nativeToScVal: jest.fn(() => ({})),
    scValToNative: jest.fn(() => ({ ok: BigInt(42) })),
    xdr: {
      Address: { publicKey: jest.fn(() => ({})) },
      ScVal: { scvU64: jest.fn(() => ({})) },
      ScBytes: { scBytes: jest.fn(() => ({})) },
      ContractEvent: { v0: jest.fn(() => ({ contractId: () => Buffer.alloc(32), data: () => ({ value: () => ({}) }) })) },
    },
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      addMemo: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        toXDR: jest.fn().mockReturnValue('mock-xdr'),
        sign: jest.fn(),
        signers: jest.fn(),
        hash: jest.fn().mockReturnValue('mock-hash'),
      }),
    })),
    Keypair: {
      fromPublicKey: jest.fn().mockReturnValue({
        signDecorated: jest.fn(),
      }),
    },
    rpc: {
      Server: jest.fn().mockImplementation(() => ({
        prepareTransaction: jest.fn().mockImplementation((tx: unknown) =>
          Promise.resolve({
            toXDR: jest.fn().mockReturnValue('prepared-xdr'),
          }),
        ),
        sendTransaction: jest.fn().mockResolvedValue({
          status: 'ERROR',
          hash: 'err-hash',
          errorResult: undefined,
        }),
        getTransaction: jest.fn().mockResolvedValue({
          status: 'NOT_FOUND',
        }),
        getEvents: jest.fn().mockResolvedValue({ events: [], latestLedger: 100 }),
      })),
      Api: {
        GetTransactionStatus: {
          SUCCESS: 'SUCCESS',
          NOT_FOUND: 'NOT_FOUND',
        },
      },
    },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanService, GistError, GistContractError } from './soroban.service';

describe('SorobanService', () => {
  describe('mock mode (no CONTRACT_ID_GIST_REGISTRY)', () => {
    let service: SorobanService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SorobanService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                const env: Record<string, string> = {};
                return env[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      service = module.get(SorobanService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    // ── postGist (mock) ──────────────────────────────────────────────────

    describe('postGist in mock mode', () => {
      it('returns a mock result with gistId and txHash', async () => {
        const result = await service.postGist(null, 'cell-abc', 'hash-123');
        expect(result.mock).toBe(true);
        expect(result.gistId).toBeDefined();
        expect(result.txHash).toMatch(/^mock_tx_/);
      });

      it('accepts an author argument without error', async () => {
        const result = await service.postGist(
          'GBFNWEU3OM7QT7Y7UAZU6FHLSJIISTT3MSPBICAK4FSBIF5YL4W6IDCK',
          'cell-abc',
          'hash-123',
        );
        expect(result.mock).toBe(true);
      });

      it('accepts ttlSecs argument without error', async () => {
        const result = await service.postGist(null, 'cell-abc', 'hash-123', 3600);
        expect(result.mock).toBe(true);
      });
    });

    // ── getGist (mock) ───────────────────────────────────────────────────

    describe('getGist in mock mode', () => {
      it('returns a mock gist with all fields including expiresAt and hidden', async () => {
        const result = await service.getGist('1');
        expect(result).not.toBeNull();
        expect(result!.mock).toBe(true);
        expect(result!.gistId).toBe('1');
        expect(result!.locationCell).toBe('mock_cell');
        expect(result!.contentHash).toMatch(/^mock_Qm/);
        expect(result!.createdAt).toBeGreaterThan(0);
        expect(typeof result!.expiresAt).toBe('number');
        expect(typeof result!.hidden).toBe('boolean');
        expect(result!.hidden).toBe(false);
      });
    });

    // ── isActive (mock) ──────────────────────────────────────────────────

    describe('isActive in mock mode', () => {
      it('returns active: true in mock mode', async () => {
        const result = await service.isActive('1');
        expect(result.mock).toBe(true);
        expect(result.active).toBe(true);
      });
    });

    // ── listGistsByCell (mock) ───────────────────────────────────────────

    describe('listGistsByCell in mock mode', () => {
      it('returns an empty list in mock mode', async () => {
        const result = await service.listGistsByCell('cell-abc', 0, 10);
        expect(result.mock).toBe(true);
        expect(result.gists).toEqual([]);
      });
    });

    // ── getEventsSince (mock) ────────────────────────────────────────────

    describe('getEventsSince in mock mode', () => {
      it('returns an empty array', async () => {
        const result = await service.getEventsSince(0);
        expect(result).toEqual([]);
      });
    });
  });

  describe('GistContractError', () => {
    it('has correct name', () => {
      const err = new GistContractError(GistError.TtlZero);
      expect(err.name).toBe('GistContractError');
    });

    it('has the correct code', () => {
      const err = new GistContractError(GistError.CooldownActive);
      expect(err.code).toBe(GistError.CooldownActive);
    });

    it('uses the label as default message', () => {
      const err = new GistContractError(GistError.TtlTooLong);
      expect(err.message).toBe('TtlTooLong');
    });

    it('accepts a custom message', () => {
      const err = new GistContractError(GistError.NotFound, 'gist not found');
      expect(err.message).toBe('gist not found');
    });

    it('is an instance of Error', () => {
      const err = new GistContractError(GistError.NotAuthorized);
      expect(err).toBeInstanceOf(Error);
    });

    it.each([
      [GistError.TtlZero, 'TtlZero'],
      [GistError.TtlTooLong, 'TtlTooLong'],
      [GistError.CooldownActive, 'CooldownActive'],
      [GistError.NotFound, 'NotFound'],
      [GistError.NotAuthorized, 'NotAuthorized'],
      [GistError.AlreadyInitialized, 'AlreadyInitialized'],
      [GistError.NotInitialized, 'NotInitialized'],
      [GistError.AnonymousImmutable, 'AnonymousImmutable'],
    ])('code %d maps to label "%s"', (code, label) => {
      const err = new GistContractError(code);
      expect(err.message).toBe(label);
      expect(err.code).toBe(code);
    });
  });

  describe('GistError enum', () => {
    it('has all 8 error codes', () => {
      const values = Object.values(GistError).filter(
        (v) => typeof v === 'number',
      );
      expect(values).toHaveLength(8);
    });

    it('codes are 1-8', () => {
      const codes = Object.values(GistError)
        .filter((v) => typeof v === 'number')
        .sort((a, b) => (a as number) - (b as number));
      expect(codes).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
});
