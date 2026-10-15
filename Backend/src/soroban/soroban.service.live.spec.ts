/**
 * Live-mode tests for SorobanService with a mocked RPC server: the success path and one
 * failure path for each live method, including GistContractError mapping.
 */
const mockServer = {
  getAccount: jest.fn(),
  prepareTransaction: jest.fn(),
  sendTransaction: jest.fn(),
  getTransaction: jest.fn(),
  simulateTransaction: jest.fn(),
  getEvents: jest.fn(),
  getLatestLedger: jest.fn(),
};

jest.mock('@stellar/stellar-sdk', () => ({
  Address: { fromString: jest.fn((k: string) => ({ address: k })) },
  BASE_FEE: '100',
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  Contract: jest.fn().mockImplementation(() => ({
    contractId: () => 'CONTRACT',
    call: jest.fn(() => ({})),
  })),
  Keypair: {
    fromSecret: jest.fn(() => ({ publicKey: () => 'GPUBLIC' })),
  },
  TransactionBuilder: jest.fn().mockImplementation(() => {
    const builder = {
      addOperation: jest.fn(() => builder),
      setTimeout: jest.fn(() => builder),
      build: jest.fn(() => ({ sign: jest.fn() })),
    };
    return builder;
  }),
  nativeToScVal: jest.fn((value: unknown) => ({ native: value })),
  scValToNative: jest.fn((value: unknown) =>
    value && typeof value === 'object' && 'native' in value
      ? (value as { native: unknown }).native
      : value,
  ),
  xdr: {},
  rpc: {
    Server: jest.fn().mockImplementation(() => mockServer),
    Api: {
      isSimulationError: (sim: { error?: string }) => 'error' in sim,
      GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED', NOT_FOUND: 'NOT_FOUND' },
    },
  },
}));

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GistContractError, GistError, SorobanService } from './soroban.service';

const buildService = () => {
  const env: Record<string, unknown> = {
    CONTRACT_ID_GIST_REGISTRY: 'CONTRACT',
    STELLAR_SECRET_KEY: 'SSECRET',
    SOROBAN_RETRY_ATTEMPTS: 1,
    STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => env[key] ?? fallback),
  } as unknown as ConfigService;
  return new SorobanService(config);
};

const simulationOk = (native: unknown) => ({ result: { retval: { native } } });

describe('SorobanService (live mode, mocked RPC)', () => {
  let service: SorobanService;

  beforeEach(() => {
    Object.values(mockServer).forEach((fn) => fn.mockReset());
    mockServer.getAccount.mockResolvedValue({ accountId: () => 'GPUBLIC' });
    mockServer.prepareTransaction.mockImplementation(async (tx: unknown) => tx);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    service = buildService();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('postGist', () => {
    it('submits the transaction and returns the gist id and tx hash', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'tx-1' });
      mockServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        returnValue: { native: { ok: 42n } },
      });

      const result = await service.postGist(null, 'cell', 'cid', 3600);

      expect(result).toEqual({ gistId: '42', txHash: 'tx-1', mock: false });
      expect(mockServer.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws when the RPC rejects the transaction', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'ERROR', hash: 'tx-2' });

      await expect(service.postGist(null, 'cell', 'cid')).rejects.toThrow(
        'Soroban post_gist rejected',
      );
    });

    it('maps a contract Err result to a typed GistContractError', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'tx-3' });
      mockServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        returnValue: { native: { err: GistError.CooldownActive } },
      });

      const error = await service.postGist(null, 'cell', 'cid').catch((err: unknown) => err);

      expect(error).toBeInstanceOf(GistContractError);
      expect((error as GistContractError).code).toBe(GistError.CooldownActive);
    });
  });

  describe('getGist', () => {
    it('decodes the gist record returned by the simulation', async () => {
      mockServer.simulateTransaction.mockResolvedValue(
        simulationOk({
          gist_id: 7n,
          location_cell: 'cell',
          content_hash: 'cid',
          created_at: 100n,
          expires_at: 200n,
          hidden: false,
          author: null,
        }),
      );

      const result = await service.getGist('7');

      expect(result).toEqual({
        gistId: '7',
        locationCell: 'cell',
        contentHash: 'cid',
        createdAt: 100,
        expiresAt: 200,
        hidden: false,
        author: null,
        mock: false,
      });
    });

    it('returns null when the contract has no such gist', async () => {
      mockServer.simulateTransaction.mockResolvedValue(simulationOk(null));

      await expect(service.getGist('7')).resolves.toBeNull();
    });

    it('throws when the simulation fails', async () => {
      mockServer.simulateTransaction.mockResolvedValue({ error: 'HostError' });

      await expect(service.getGist('7')).rejects.toThrow('Soroban get_gist failed for gist 7');
    });
  });

  describe('isActive', () => {
    it('returns the boolean from the simulation', async () => {
      mockServer.simulateTransaction.mockResolvedValue(simulationOk(true));

      await expect(service.isActive('7')).resolves.toEqual({ active: true, mock: false });
    });

    it('throws when the simulation fails', async () => {
      mockServer.simulateTransaction.mockResolvedValue({ error: 'HostError' });

      await expect(service.isActive('7')).rejects.toThrow('Soroban is_active failed for gist 7');
    });
  });

  describe('listGistsByCell', () => {
    it('normalizes every record in the returned vector', async () => {
      const record = {
        gist_id: 1n,
        location_cell: 'cell',
        content_hash: 'cid',
        created_at: 1,
        expires_at: 2,
        hidden: false,
        author: null,
      };
      mockServer.simulateTransaction.mockResolvedValue(simulationOk([record, record]));

      const result = await service.listGistsByCell('cell', 0, 10);

      expect(result.mock).toBe(false);
      expect(result.gists).toHaveLength(2);
      expect(result.gists[0]).toMatchObject({ gistId: '1', locationCell: 'cell' });
    });

    it('throws when the contract returns something other than a vector', async () => {
      mockServer.simulateTransaction.mockResolvedValue(simulationOk('nope'));

      await expect(service.listGistsByCell('cell', 0, 10)).rejects.toThrow(
        'returned non-array for cell cell',
      );
    });
  });

  describe('getAdmin', () => {
    it('returns the admin address', async () => {
      mockServer.simulateTransaction.mockResolvedValue(simulationOk('GADMIN'));

      await expect(service.getAdmin()).resolves.toEqual({ admin: 'GADMIN', mock: false });
    });

    it('throws when the simulation fails', async () => {
      mockServer.simulateTransaction.mockResolvedValue({ error: 'HostError' });

      await expect(service.getAdmin()).rejects.toThrow('Soroban get_admin failed');
    });
  });

  describe('reportGist', () => {
    it('returns the new report count', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'tx-4' });
      mockServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        returnValue: { native: 4n },
      });

      await expect(service.reportGist('7')).resolves.toEqual({ count: 4, mock: false });
    });

    it('throws when the RPC rejects the transaction', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'ERROR', hash: 'tx-5' });

      await expect(service.reportGist('7')).rejects.toThrow('Soroban report_gist rejected');
    });
  });

  describe('getEventsSince', () => {
    it('decodes the events returned by the RPC', async () => {
      mockServer.getEvents.mockResolvedValue({
        events: [
          {
            topic: [{ native: 'gist_deleted' }],
            value: { native: { gist_id: 5n } },
            ledger: 10,
            id: 'event-1',
          },
        ],
        latestLedger: 11,
      });

      const events = await service.getEventsSince(9);

      expect(events).toEqual([{ type: 'gist_deleted', gistId: '5', ledger: 10, id: 'event-1' }]);
    });

    it('propagates an RPC failure', async () => {
      mockServer.getEvents.mockRejectedValue(new Error('rpc unavailable'));

      await expect(service.getEventsSince(9)).rejects.toThrow('rpc unavailable');
    });
  });
});
