export const BIN_WIDTH = 20;
export const MAX_GIST_CHARS = 280;
export const BIN_COUNT = MAX_GIST_CHARS / BIN_WIDTH;
export const EMPTY_LABEL = 'Empty';

export interface ContentLengthBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface ContentLengthSummary {
  bins: ContentLengthBin[];
  emptyCount: number;
  total: number;
  medianLength: number | null;
}

export function binIndexForLength(length: number | null | undefined): number | null {
  if (typeof length !== 'number' || Number.isNaN(length) || length <= 0) return null;
  return Math.min(BIN_COUNT - 1, Math.floor((length - 1) / BIN_WIDTH));
}

export function binLabel(index: number): string {
  const min = index * BIN_WIDTH;
  const isLast = index === BIN_COUNT - 1;
  return `${min}–${isLast ? MAX_GIST_CHARS : min + BIN_WIDTH - 1}`;
}

export function buildBins(): ContentLengthBin[] {
  return Array.from({ length: BIN_COUNT }, (_, index) => ({
    label: binLabel(index),
    min: index * BIN_WIDTH,
    max: index === BIN_COUNT - 1 ? MAX_GIST_CHARS : (index + 1) * BIN_WIDTH - 1,
    count: 0,
  }));
}

export function median(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function countContentLengths(
  contents: ReadonlyArray<string | null | undefined>,
): ContentLengthSummary {
  const bins = buildBins();
  const lengths: number[] = [];
  let emptyCount = 0;

  for (const content of contents) {
    const length = typeof content === 'string' ? content.length : 0;
    const index = binIndexForLength(length);
    if (index === null) {
      emptyCount += 1;
      continue;
    }
    bins[index].count += 1;
    lengths.push(length);
  }

  return { bins, emptyCount, total: contents.length, medianLength: median(lengths) };
}
