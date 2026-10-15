import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IpfsService } from './ipfs.service';

const pinJSONToIPFS = jest.fn();
const PinataClient = jest.fn().mockImplementation(() => ({ pinJSONToIPFS }));

jest.mock('@pinata/sdk', () => PinataClient, { virtual: true });

const buildService = (values: Record<string, unknown> = {}) => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
  return new IpfsService(config);
};

const LIVE = { PINATA_API_KEY: 'key', PINATA_SECRET_KEY: 'secret' };

describe('IpfsService', () => {
  beforeEach(() => {
    pinJSONToIPFS.mockReset();
    PinataClient.mockClear();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('dev mode (no Pinata keys)', () => {
    it('returns a mock CID without touching Pinata', async () => {
      const service = buildService();

      const result = await service.pinJson({ a: 1 });

      expect(result.mock).toBe(true);
      expect(result.cid).toMatch(/^mock_Qm[0-9a-f]{32}$/);
      expect(PinataClient).not.toHaveBeenCalled();
    });

    it('returns a placeholder document from getJson', async () => {
      const service = buildService();

      const doc = await service.getJson('mock_Qmabc');

      expect(doc).toMatchObject({ cid: 'mock_Qmabc', mock: true });
    });
  });

  describe('live mode', () => {
    it('pins through the Pinata client and returns the IpfsHash', async () => {
      pinJSONToIPFS.mockResolvedValue({ IpfsHash: 'QmLive' });

      const result = await buildService(LIVE).pinJson({ a: 1 });

      expect(PinataClient).toHaveBeenCalledWith('key', 'secret');
      expect(pinJSONToIPFS).toHaveBeenCalledWith({ a: 1 }, expect.any(Object));
      expect(result).toEqual({ cid: 'QmLive', mock: false });
    });

    it('retries a failed pin and succeeds', async () => {
      jest.useFakeTimers();
      pinJSONToIPFS
        .mockRejectedValueOnce(new Error('temporary'))
        .mockResolvedValueOnce({ IpfsHash: 'QmRetry' });

      const promise = buildService(LIVE).pinJson({ a: 1 });
      await jest.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toEqual({ cid: 'QmRetry', mock: false });
      expect(pinJSONToIPFS).toHaveBeenCalledTimes(2);
    });

    it('throws the last error once all attempts fail', async () => {
      jest.useFakeTimers();
      pinJSONToIPFS.mockRejectedValue(new Error('still down'));

      const promise = buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 2 }).pinJson({ a: 1 });
      const assertion = expect(promise).rejects.toThrow('still down');
      await jest.advanceTimersByTimeAsync(1000);

      await assertion;
      expect(pinJSONToIPFS).toHaveBeenCalledTimes(2);
    });
  });

  describe('getJson with a real CID', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fetches the document from the configured gateway', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ hello: 'world' }) });
      global.fetch = fetchMock as unknown as typeof fetch;
      const service = buildService({ ...LIVE, 'ipfs.gateway': 'https://gw.example/ipfs' });

      const doc = await service.getJson('QmReal');

      expect(fetchMock).toHaveBeenCalledWith('https://gw.example/ipfs/QmReal');
      expect(doc).toEqual({ hello: 'world' });
    });

    it('throws when the gateway responds with an error status', async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;
      const service = buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 1 });

      await expect(service.getJson('QmReal')).rejects.toThrow('IPFS fetch failed: 502');
    });
  });
});
