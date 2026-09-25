export const CUMULATIVE_URL_KEY = 'view';

export const CUMULATIVE_MODES = ['per-bucket', 'cumulative'] as const;
export type CumulativeMode = typeof CUMULATIVE_MODES[number];

export const DEFAULT_CUMULATIVE_MODE: CumulativeMode = 'per-bucket';

export interface CumulativeResult {
  totals: Array<number | null>;
  startIndex: number | null;
  hasData: boolean;
}

export function cumulativeTotals(
  values: ReadonlyArray<number | null | undefined>,
): CumulativeResult {
  const totals: Array<number | null> = [];
  let startIndex: number | null = null;
  let running = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      if (startIndex === null) startIndex = i;
      running += value;
      totals.push(running);
    } else {
      totals.push(null);
    }
  }

  return { totals, startIndex, hasData: startIndex !== null };
}

export function cumulativeHasData(values: ReadonlyArray<number | null | undefined>): boolean {
  return values.some(
    (value) => typeof value === 'number' && !Number.isNaN(value),
  );
}

export function isCumulativeMode(value: unknown): value is CumulativeMode {
  return typeof value === 'string' && (CUMULATIVE_MODES as readonly string[]).includes(value);
}

export function parseCumulativeMode(raw: string | null | undefined): CumulativeMode {
  return isCumulativeMode(raw) ? raw : DEFAULT_CUMULATIVE_MODE;
}

export function serializeCumulativeMode(mode: CumulativeMode): string {
  return mode;
}

export function toggleCumulativeMode(mode: CumulativeMode): CumulativeMode {
  return mode === 'cumulative' ? 'per-bucket' : 'cumulative';
}
