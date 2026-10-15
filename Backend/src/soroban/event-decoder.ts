/**
 * @module soroban/event-decoder
 * Typed decoding of GistRegistry contract events. Re-exported from
 * `soroban.service.ts` for backwards compatibility.
 */
import { scValToNative, xdr } from '@stellar/stellar-sdk';

// ── Event topic constants & discriminated union ────────────────────────────────

export const GIST_EVENT_TOPICS = {
  POSTED: 'gist_posted',
  EDITED: 'gist_edited',
  DELETED: 'gist_deleted',
  HIDDEN: 'gist_hidden',
  UNHIDDEN: 'gist_unhidden',
  REMOVED: 'gist_removed',
  REPORTED: 'gist_reported',
} as const;

export type GistEventTopic = (typeof GIST_EVENT_TOPICS)[keyof typeof GIST_EVENT_TOPICS];

export interface GistRecord {
  gistId: string;
  locationCell: string;
  contentHash: string;
  author: string | null;
  createdAt: number;
  expiresAt: number;
  hidden: boolean;
}

export interface GistPostedEvent {
  type: 'gist_posted';
  gist: GistRecord;
  ledger: number;
  /** Unique Soroban RPC event id (e.g. `<ledger>-<index>`), used to dedupe the event log. */
  id: string;
}

export interface GistEditedEvent {
  type: 'gist_edited';
  gist: GistRecord;
  ledger: number;
  id: string;
}

export interface GistDeletedEvent {
  type: 'gist_deleted';
  gistId: string;
  ledger: number;
  id: string;
}

export interface GistHiddenEvent {
  type: 'gist_hidden';
  gistId: string;
  ledger: number;
  id: string;
}

export interface GistUnhiddenEvent {
  type: 'gist_unhidden';
  gistId: string;
  ledger: number;
  id: string;
}

export interface GistRemovedEvent {
  type: 'gist_removed';
  gistId: string;
  ledger: number;
  id: string;
}

export interface GistReportedEvent {
  type: 'gist_reported';
  gistId: string;
  count: number;
  ledger: number;
  id: string;
}

export type GistRegistryEvent =
  | GistPostedEvent
  | GistEditedEvent
  | GistDeletedEvent
  | GistHiddenEvent
  | GistUnhiddenEvent
  | GistRemovedEvent
  | GistReportedEvent;

// ── Event decoder helpers ─────────────────────────────────────────────────────

function decoderReadString(value: unknown): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) return String(value);
  throw new Error('Expected a string-like value');
}

function decoderReadNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error('Expected a numeric value');
  return parsed;
}

function decoderReadMaybeString(value: unknown): string | null {
  if (value == null) return null;
  return decoderReadString(value);
}

function decodeGistRecord(payload: Record<string, unknown>): GistRecord {
  return {
    gistId: decoderReadString(payload.gist_id ?? payload.gistId),
    locationCell: decoderReadString(payload.location_cell ?? payload.locationCell),
    contentHash: decoderReadString(payload.content_hash ?? payload.contentHash),
    author: decoderReadMaybeString(payload.author),
    createdAt: decoderReadNumber(payload.created_at ?? payload.createdAt),
    expiresAt: decoderReadNumber(payload.expires_at ?? payload.expiresAt),
    hidden: Boolean(payload.hidden),
  };
}

/**
 * Decode a raw Soroban event emitted by the GistRegistry contract into a
 * typed, discriminated-union result. Returns `null` for unrecognized or
 * malformed events — it never throws.
 */
export function decodeGistRegistryEvent(
  eventName: string,
  value: xdr.ScVal | undefined,
  ledger: number,
  id: string,
): GistRegistryEvent | null {
  if (!value) return null;

  try {
    const native = scValToNative(value);

    switch (eventName) {
      case GIST_EVENT_TOPICS.POSTED:
      case GIST_EVENT_TOPICS.EDITED: {
        if (!native || typeof native !== 'object') return null;
        const gist = decodeGistRecord(native as Record<string, unknown>);
        return { type: eventName, gist, ledger, id };
      }

      case GIST_EVENT_TOPICS.DELETED:
      case GIST_EVENT_TOPICS.HIDDEN:
      case GIST_EVENT_TOPICS.UNHIDDEN:
      case GIST_EVENT_TOPICS.REMOVED: {
        if (!native || typeof native !== 'object') return null;
        const record = native as Record<string, unknown>;
        const raw = record.gist_id ?? record.gistId;
        if (raw == null) return null;
        const gistId = decoderReadString(raw);
        if (gistId === '[object Object]') return null;
        return { type: eventName, gistId, ledger, id };
      }

      case GIST_EVENT_TOPICS.REPORTED: {
        if (!native || typeof native !== 'object') return null;
        const record = native as Record<string, unknown>;
        return {
          type: 'gist_reported',
          gistId: decoderReadString(record.gist_id ?? record.gistId),
          count: decoderReadNumber(record.count),
          ledger,
          id,
        };
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
