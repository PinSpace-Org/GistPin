type JsonRecord = Record<string, unknown>;

export interface IpfsServiceMock {
  pinJson: jest.Mock<Promise<{ cid: string; mock: true }>, [JsonRecord]>;
  getJson: jest.Mock<Promise<JsonRecord>, [string]>;
  seedJson: (cid: string, payload: JsonRecord) => void;
  reset: () => void;
}

export function createIpfsServiceMock(): IpfsServiceMock {
  const contentByCid = new Map<string, JsonRecord>();
  let nextCid = 1;

  return {
    pinJson: jest.fn(async (payload: JsonRecord) => {
      const cid = `mock_cid_${String(nextCid++).padStart(4, '0')}`;
      contentByCid.set(cid, payload);
      return { cid, mock: true as const };
    }),
    getJson: jest.fn(async (cid: string) => {
      return contentByCid.get(cid) ?? { cid, mock: true };
    }),
    seedJson(cid: string, payload: JsonRecord) {
      contentByCid.set(cid, payload);
    },
    reset() {
      contentByCid.clear();
      nextCid = 1;
      this.pinJson.mockClear();
      this.getJson.mockClear();
    },
  };
}
