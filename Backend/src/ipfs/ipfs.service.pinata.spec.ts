import { ConfigService } from '@nestjs/config';

import { IpfsService } from './ipfs.service';

const pinJSONToIPFS = jest.fn();
const PinataClient = jest.fn().mockImplementation(() => ({ pinJSONToIPFS }));

jest.mock('@pinata/sdk', () => PinataClient, { virtual: true });

describe('IpfsService with Pinata keys set', () => {
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
    PinataClient.mockClear();
    pinJSONToIPFS.mockReset();
  });

  it('constructs the Pinata client with the configured keys', () => {
    buildService();

    expect(PinataClient).toHaveBeenCalledWith('dummy-key', 'dummy-secret');
  });

  it('pins through the Pinata client and returns a non-mock CID', async () => {
    pinJSONToIPFS.mockResolvedValue({ IpfsHash: 'QmRealCid' });

    const result = await buildService().pinJson({ hello: 'world' });

    expect(pinJSONToIPFS).toHaveBeenCalledWith({ hello: 'world' }, expect.any(Object));
    expect(result).toEqual({ cid: 'QmRealCid', mock: false });
  });
});
