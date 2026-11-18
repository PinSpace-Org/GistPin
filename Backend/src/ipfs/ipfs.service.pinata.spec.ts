import { ConfigService } from '@nestjs/config';

import { IpfsService } from './ipfs.service';

describe('IpfsService with Pinata keys set', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

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
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('is not in dev mode and does not call Pinata on construction', () => {
    buildService();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pins via the Pinata REST API with the configured keys and returns a non-mock CID', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ IpfsHash: 'QmRealCid' }) });

    const result = await buildService().pinJson({ hello: 'world' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.pinata.cloud/pinning/pinJSONToIPFS');
    expect(init.headers).toMatchObject({
      pinata_api_key: 'dummy-key',
      pinata_secret_api_key: 'dummy-secret',
    });
    expect(JSON.parse(init.body)).toMatchObject({ pinataContent: { hello: 'world' } });
    expect(result).toEqual({ cid: 'QmRealCid', mock: false });
  });
});
