import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IpfsService } from './ipfs.service';

/** Stand-in for the Pinata REST endpoint; installed as the global fetch. */
const pinFetch = jest.fn();
const pinOk = (hash: string) => ({ ok: true, status: 200, json: async () => ({ IpfsHash: hash }) });
const realFetch = global.fetch;

const buildService = (values: Record<string, unknown> = {}) => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
  return new IpfsService(config);
};

const LIVE = { PINATA_API_KEY: 'key', PINATA_SECRET_KEY: 'secret' };

describe('IpfsService', () => {
  beforeEach(() => {
    pinFetch.mockReset();
    global.fetch = pinFetch as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = realFetch;
  });

  describe('dev mode (no Pinata keys)', () => {
    it('returns a mock CID without touching Pinata', async () => {
      const service = buildService();

      const result = await service.pinJson({ a: 1 });

      expect(result.mock).toBe(true);
      expect(result.cid).toMatch(/^mock_Qm[0-9a-f]{32}$/);
      expect(pinFetch).not.toHaveBeenCalled();
    });

    it('returns a placeholder document from getJson', async () => {
      const service = buildService();

      const doc = await service.getJson('mock_Qmabc');

      expect(doc).toMatchObject({ cid: 'mock_Qmabc', mock: true });
    });
  });

  describe('live mode', () => {
    it('pins through the Pinata REST API with dummy credentials and returns the IpfsHash', async () => {
      pinFetch.mockResolvedValue(pinOk('QmLive'));

      const result = await buildService(LIVE).pinJson({ a: 1 });

      expect(pinFetch).toHaveBeenCalledTimes(1);
      const [url, init] = pinFetch.mock.calls[0];
      expect(url).toBe('https://api.pinata.cloud/pinning/pinJSONToIPFS');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        pinata_api_key: 'key',
        pinata_secret_api_key: 'secret',
        'Content-Type': 'application/json',
      });
      const body = JSON.parse(init.body);
      expect(body.pinataContent).toEqual({ a: 1 });
      expect(body.pinataMetadata.name).toMatch(/^gist-\d+$/);
      expect(result).toEqual({ cid: 'QmLive', mock: false });
    });

    it('uses a configured Pinata API URL', async () => {
      pinFetch.mockResolvedValue(pinOk('QmMock'));
      await buildService({ ...LIVE, PINATA_API_URL: 'http://mock.pinata.test' }).pinJson({ a: 1 });
      expect(pinFetch.mock.calls[0][0]).toBe('http://mock.pinata.test/pinning/pinJSONToIPFS');
    });

    it('retries a failed pin and succeeds', async () => {
      jest.useFakeTimers();
      pinFetch
        .mockRejectedValueOnce(new Error('temporary'))
        .mockResolvedValueOnce(pinOk('QmRetry'));

      const promise = buildService(LIVE).pinJson({ a: 1 });
      await jest.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toEqual({ cid: 'QmRetry', mock: false });
      expect(pinFetch).toHaveBeenCalledTimes(2);
    });

    it('throws the last error once all attempts fail', async () => {
      jest.useFakeTimers();
      pinFetch.mockRejectedValue(new Error('still down'));

      const promise = buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 2 }).pinJson({ a: 1 });
      const assertion = expect(promise).rejects.toThrow('still down');
      await jest.advanceTimersByTimeAsync(1000);

      await assertion;
      expect(pinFetch).toHaveBeenCalledTimes(2);
    });

    it('treats a non-2xx response as a failure', async () => {
      pinFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      await expect(
        buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 1 }).pinJson({ a: 1 }),
      ).rejects.toThrow('IPFS pin failed: 401');
    });

    it('treats a response without an IpfsHash as a failure', async () => {
      pinFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
      await expect(
        buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 1 }).pinJson({ a: 1 }),
      ).rejects.toThrow('no IpfsHash');
    });
  });

  describe('getJson with a real CID', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fetches the document from the configured gateway', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ hello: 'world' }) });
      global.fetch = fetchMock as unknown as typeof fetch;
      const service = buildService({ ...LIVE, 'ipfs.gateway': 'https://gw.example/ipfs' });

      const doc = await service.getJson('QmReal');

      expect(fetchMock).toHaveBeenCalledWith('https://gw.example/ipfs/QmReal');
      expect(doc).toEqual({ hello: 'world' });
    });

    it('throws when the gateway responds with an error status', async () => {
      jest.useFakeTimers();
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;
      const service = buildService({ ...LIVE, IPFS_RETRY_ATTEMPTS: 1 });

      await expect(service.getJson('QmReal')).rejects.toThrow('IPFS fetch failed: 502');
    });
  });
});
