import { ConfigService } from '@nestjs/config';

import { IpfsService } from './ipfs.service';

/** Dummy credentials against a mocked Pinata REST endpoint; no real network. */
describe('IpfsService with Pinata keys set', () => {
  const realFetch = global.fetch;
  const pinFetch = jest.fn();

  const buildService = () => {
    const values: Record<string, unknown> = {
      PINATA_API_KEY: 'dummy-key',
      PINATA_SECRET_KEY: 'dummy-secret',
    };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
    } as unknown as ConfigService;
    return new IpfsService(config);
  };

  beforeEach(() => {
    pinFetch.mockReset();
    global.fetch = pinFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('does not call Pinata until something is pinned', () => {
    buildService();

    expect(pinFetch).not.toHaveBeenCalled();
  });

  it('pins through the Pinata REST API and returns a non-mock CID', async () => {
    pinFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ IpfsHash: 'QmRealCid' }),
    });

    const result = await buildService().pinJson({ hello: 'world' });

    const [url, init] = pinFetch.mock.calls[0];
    expect(url).toBe('https://api.pinata.cloud/pinning/pinJSONToIPFS');
    expect(init.headers).toMatchObject({
      pinata_api_key: 'dummy-key',
      pinata_secret_api_key: 'dummy-secret',
    });
    expect(JSON.parse(init.body).pinataContent).toEqual({ hello: 'world' });
    expect(result).toEqual({ cid: 'QmRealCid', mock: false });
  });
});
