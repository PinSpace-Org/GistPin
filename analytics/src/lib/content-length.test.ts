import { describe, it, expect } from 'vitest';
import {
  BIN_COUNT,
  BIN_WIDTH,
  EMPTY_LABEL,
  MAX_GIST_CHARS,
  binIndexForLength,
  binLabel,
  buildBins,
  countContentLengths,
  median,
} from './content-length';

function countFor(contents: string[], length: number): number {
  const summary = countContentLengths(contents);
  const index = binIndexForLength(length);
  return index === null ? summary.emptyCount : (summary.bins[index]?.count ?? -1);
}

describe('bin constants', () => {
  it('covers 280 characters in bins of 20', () => {
    expect(BIN_WIDTH).toBe(20);
    expect(MAX_GIST_CHARS).toBe(280);
    expect(BIN_COUNT).toBe(14);
  });
});

describe('binIndexForLength', () => {
  it('places lengths in 20-character bins', () => {
    expect(binIndexForLength(1)).toBe(0);
    expect(binIndexForLength(20)).toBe(0);
    expect(binIndexForLength(21)).toBe(1);
    expect(binIndexForLength(40)).toBe(1);
    expect(binIndexForLength(41)).toBe(2);
  });

  it('clamps anything past the 280 character limit into the last bin', () => {
    expect(binIndexForLength(280)).toBe(BIN_COUNT - 1);
    expect(binIndexForLength(1000)).toBe(BIN_COUNT - 1);
  });

  it('treats empty and invalid lengths as uncounted', () => {
    expect(binIndexForLength(0)).toBeNull();
    expect(binIndexForLength(null)).toBeNull();
    expect(binIndexForLength(Number.NaN)).toBeNull();
  });
});

describe('binLabel', () => {
  it('labels the first and last bins inclusively', () => {
    expect(binLabel(0)).toBe('0–19');
    expect(binLabel(1)).toBe('20–39');
    expect(binLabel(BIN_COUNT - 1)).toBe(`260–${MAX_GIST_CHARS}`);
  });
});

describe('buildBins', () => {
  it('starts empty and covers the whole range', () => {
    const bins = buildBins();
    expect(bins).toHaveLength(BIN_COUNT);
    expect(bins[0].min).toBe(0);
    expect(bins[0].count).toBe(0);
    expect(bins[0].max).toBe(19);
  });
});

describe('median', () => {
  it('handles odd and even sets', () => {
    expect(median([10, 30, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
    expect(median([])).toBeNull();
  });
});

describe('countContentLengths', () => {
  it('counts gists per bin', () => {
    const summary = countContentLengths(['a'.repeat(5), 'b'.repeat(25), 'c'.repeat(5)]);
    expect(summary.bins[0].count).toBe(2);
    expect(summary.bins[1].count).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('counts empty content separately', () => {
    const summary = countContentLengths(['', null, undefined, '   ']);
    expect(summary.emptyCount).toBe(4);
    expect(summary.bins[0].count).toBe(0);
    expect(EMPTY_LABEL).toBe('Empty');
  });

  it('reports the median length of non-empty gists', () => {
    const summary = countContentLengths(['a'.repeat(10), 'b'.repeat(20), 'c'.repeat(60)]);
    expect(summary.medianLength).toBe(20);
  });

  it('has no median when every gist is empty', () => {
    expect(countContentLengths(['', null]).medianLength).toBeNull();
  });

  it('handles an empty response', () => {
    const summary = countContentLengths([]);
    expect(summary.total).toBe(0);
    expect(summary.emptyCount).toBe(0);
    expect(summary.bins).toHaveLength(BIN_COUNT);
  });

  it('exposes a helper-shaped count for a target length', () => {
    expect(countFor(['a'.repeat(5)], 5)).toBe(1);
  });
});
