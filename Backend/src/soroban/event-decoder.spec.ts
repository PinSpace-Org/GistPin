import {
  decodeGistRegistryEvent,
  GIST_EVENT_TOPICS,
} from './soroban.service';
import { nativeToScVal } from '@stellar/stellar-sdk';

/**
 * Unit tests for the GistRegistry event decoder.
 *
 * Issue #1033 — decode all 7 event topics into a typed discriminated union.
 */
describe('decodeGistRegistryEvent', () => {
  const LEDGER = 12345;

  const buildGistPayload = (overrides: Record<string, unknown> = {}) =>
    nativeToScVal({
      gist_id: BigInt(1),
      author: null,
      location_cell: 's1t7d8c',
      content_hash: 'Qm123',
      created_at: BigInt(1700000000),
      expires_at: BigInt(1700086400),
      hidden: false,
      ...overrides,
    });

  const buildIdPayload = (gistId: bigint = BigInt(42)) =>
    nativeToScVal({ gist_id: gistId });

  const buildReportPayload = (gistId: bigint = BigInt(7), count: bigint = BigInt(3)) =>
    nativeToScVal({ gist_id: gistId, count });

  describe('gist_posted', () => {
    it('decodes a full Gist record', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.POSTED,
        buildGistPayload(),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_posted');
      if (result!.type === 'gist_posted') {
        expect(result!.gist.gistId).toBe('1');
        expect(result!.gist.locationCell).toBe('s1t7d8c');
        expect(result!.gist.contentHash).toBe('Qm123');
        expect(result!.gist.author).toBeNull();
        expect(result!.ledger).toBe(LEDGER);
      }
    });

    it('decodes a gist with an author', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.POSTED,
        buildGistPayload({ author: 'GABC123' }),
        LEDGER,
      );

      expect(result).not.toBeNull();
      if (result!.type === 'gist_posted') {
        expect(result!.gist.author).toBe('GABC123');
      }
    });
  });

  describe('gist_edited', () => {
    it('decodes a full Gist record', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.EDITED,
        buildGistPayload({ content_hash: 'Qm456' }),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_edited');
      if (result!.type === 'gist_edited') {
        expect(result!.gist.contentHash).toBe('Qm456');
      }
    });
  });

  describe('gist_deleted', () => {
    it('decodes a gist_id', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.DELETED,
        buildIdPayload(BigInt(99)),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_deleted');
      if (result!.type === 'gist_deleted') {
        expect(result!.gistId).toBe('99');
        expect(result!.ledger).toBe(LEDGER);
      }
    });
  });

  describe('gist_hidden', () => {
    it('decodes a gist_id', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.HIDDEN,
        buildIdPayload(BigInt(5)),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_hidden');
      if (result!.type === 'gist_hidden') {
        expect(result!.gistId).toBe('5');
      }
    });
  });

  describe('gist_unhidden', () => {
    it('decodes a gist_id', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.UNHIDDEN,
        buildIdPayload(BigInt(5)),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_unhidden');
      if (result!.type === 'gist_unhidden') {
        expect(result!.gistId).toBe('5');
      }
    });
  });

  describe('gist_removed', () => {
    it('decodes a gist_id', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.REMOVED,
        buildIdPayload(BigInt(10)),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_removed');
      if (result!.type === 'gist_removed') {
        expect(result!.gistId).toBe('10');
      }
    });
  });

  describe('gist_reported', () => {
    it('decodes gist_id and count', () => {
      const result = decodeGistRegistryEvent(
        GIST_EVENT_TOPICS.REPORTED,
        buildReportPayload(BigInt(7), BigInt(3)),
        LEDGER,
      );

      expect(result).not.toBeNull();
      expect(result!.type).toBe('gist_reported');
      if (result!.type === 'gist_reported') {
        expect(result!.gistId).toBe('7');
        expect(result!.count).toBe(3);
      }
    });
  });

  describe('unknown and malformed events', () => {
    it('returns null for an unrecognized topic', () => {
      const result = decodeGistRegistryEvent('future_event', buildIdPayload(), LEDGER);
      expect(result).toBeNull();
    });

    it('returns null when value is undefined', () => {
      const result = decodeGistRegistryEvent(GIST_EVENT_TOPICS.POSTED, undefined, LEDGER);
      expect(result).toBeNull();
    });

    it('returns null when payload is malformed (no gist_id)', () => {
      const badPayload = nativeToScVal({ wrong_field: 'x' });
      const result = decodeGistRegistryEvent(GIST_EVENT_TOPICS.DELETED, badPayload, LEDGER);
      expect(result).toBeNull();
    });
  });
});
