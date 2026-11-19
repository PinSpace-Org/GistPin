import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('round-trips a date through the base64 cursor', () => {
      const date = new Date('2026-03-04T05:06:07.890Z');

      const cursor = PaginationHelper.encodeCursor(date);

      expect(cursor).toBe(Buffer.from('2026-03-04T05:06:07.890Z').toString('base64'));
      expect(PaginationHelper.decodeCursor(cursor)).toBe('2026-03-04T05:06:07.890Z');
    });

    it('returns null for an empty string', () => {
      expect(PaginationHelper.decodeCursor('')).toBeNull();
    });

    it('returns null for a cursor with no valid base64 characters', () => {
      expect(PaginationHelper.decodeCursor('!!!')).toBeNull();
    });

    it('returns null when the decoded text is not a date', () => {
      const cursor = Buffer.from('hello').toString('base64');

      expect(PaginationHelper.decodeCursor(cursor)).toBeNull();
    });

    it('returns null for an ISO-shaped string with an impossible month', () => {
      const cursor = Buffer.from('2026-13-01T00:00:00.000Z').toString('base64');

      expect(PaginationHelper.decodeCursor(cursor)).toBeNull();
    });

    it('returns null instead of throwing when the cursor is not a string', () => {
      expect(PaginationHelper.decodeCursor(undefined as unknown as string)).toBeNull();
    });

    it('accepts a cursor encoding a different but parseable date format, returning it verbatim', () => {
      const cursor = Buffer.from('2026-03-04').toString('base64');

      expect(PaginationHelper.decodeCursor(cursor)).toBe('2026-03-04');
    });
  });

  describe('buildResponse', () => {
    const item = (iso: string) => ({ id: iso, created_at: new Date(iso) });

    it('reports hasMore and a cursor for the last item when the page is full', () => {
      const items = [item('2026-01-03T00:00:00.000Z'), item('2026-01-02T00:00:00.000Z')];

      const res = PaginationHelper.buildResponse(items, 2);

      expect(res.data).toBe(items);
      expect(res.pagination.count).toBe(2);
      expect(res.pagination.hasMore).toBe(true);
      expect(PaginationHelper.decodeCursor(res.pagination.cursor as string)).toBe(
        '2026-01-02T00:00:00.000Z',
      );
    });

    it('reports no more pages and a null cursor when the page is not full', () => {
      const res = PaginationHelper.buildResponse([item('2026-01-03T00:00:00.000Z')], 5);

      expect(res.pagination).toEqual({ count: 1, cursor: null, hasMore: false });
    });

    it('handles an empty result', () => {
      const res = PaginationHelper.buildResponse([], 10);

      expect(res).toEqual({ data: [], pagination: { count: 0, cursor: null, hasMore: false } });
    });

    it('does not build a cursor from an empty page even when the limit is zero', () => {
      const res = PaginationHelper.buildResponse([], 0);

      expect(res.pagination.cursor).toBeNull();
    });
  });
});
