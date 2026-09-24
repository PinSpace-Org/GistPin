/**
 * Pure parse/serialize logic backing the `useQueryState` hook. Kept
 * separate from the hook (which needs Next.js router context) so it can
 * be unit tested directly.
 */

export type QueryParamSchema<T> =
  | { type: 'string'; defaultValue: T & string }
  | { type: 'number'; defaultValue: T & number }
  | { type: 'date'; defaultValue: T & string } // stored/serialized as an ISO string
  | { type: 'enum'; values: readonly (T & string)[]; defaultValue: T & string };

/** Parses a raw query-string value. Falls back to the schema's default on missing/invalid input. */
export function parseParam<T>(raw: string | null, schema: QueryParamSchema<T>): T {
  if (raw === null || raw === '') return schema.defaultValue;

  switch (schema.type) {
    case 'string':
      return raw as T;

    case 'number': {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? (parsed as unknown as T) : schema.defaultValue;
    }

    case 'date': {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? schema.defaultValue : (raw as unknown as T);
    }

    case 'enum':
      return (schema.values as readonly string[]).includes(raw)
        ? (raw as unknown as T)
        : schema.defaultValue;

    default:
      return schema.defaultValue;
  }
}

/** Serializes a typed value back into a query-string value. */
export function serializeParam<T>(value: T, schema: QueryParamSchema<T>): string {
  if (schema.type === 'number') return String(value);
  return String(value);
}
