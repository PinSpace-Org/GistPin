export interface SorobanServiceMock {
  postGist: jest.Mock<Promise<{ gistId: string; txHash: string; mock: true }>, [string, string, string | undefined]>;
  getGist: jest.Mock<
    Promise<{ gistId: string; locationCell: string; contentHash: string; createdAt: number; mock: true }>,
    [string]
  >;
  getEventsSince: jest.Mock<Promise<never[]>, [number]>;
  reset: () => void;
}

export function createSorobanServiceMock(): SorobanServiceMock {
  let nextGistId = 1;
  let nextTx = 1;

  return {
    postGist: jest.fn<Promise<{ gistId: string; txHash: string; mock: true }>, [string, string, string | undefined]>(
      async () => {
      const gistId = String(nextGistId++);
      const txHash = `mock_tx_${String(nextTx++).padStart(4, '0')}`;
      return { gistId, txHash, mock: true as const };
      },
    ),
    getGist: jest.fn(async (gistId: string) => ({
      gistId,
      locationCell: 'mock_cell',
      contentHash: `mock_cid_${gistId}`,
      createdAt: Date.now(),
      mock: true as const,
    })),
    getEventsSince: jest.fn<Promise<never[]>, [number]>(async (_sinceBlock: number) => [] as never[]),
    reset() {
      nextGistId = 1;
      nextTx = 1;
      this.postGist.mockClear();
      this.getGist.mockClear();
      this.getEventsSince.mockClear();
    },
  };
}
