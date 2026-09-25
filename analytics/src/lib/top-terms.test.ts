import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MIN_TERM_LENGTH,
  DEFAULT_TERM_LIMIT,
  countTerms,
  tokenize,
  topTerms,
} from './top-terms';

describe('tokenize', () => {
  it('lowercases terms', () => {
    expect(tokenize('Hello WORLD')).toEqual(['hello', 'world']);
  });

  it('strips punctuation', () => {
    expect(tokenize('stellar, soroban! (test)')).toEqual(['stellar', 'soroban', 'test']);
  });

  it('keeps unicode letters and digits', () => {
    expect(tokenize('café naïve 東京 42')).toEqual(['café', 'naïve', '東京']);
  });

  it('drops short terms', () => {
    expect(tokenize('a be see')).toEqual(['see']);
    expect(DEFAULT_MIN_TERM_LENGTH).toBe(3);
  });

  it('drops stop words', () => {
    expect(tokenize('the quick brown fox')).toEqual(['quick', 'brown', 'fox']);
  });

  it('accepts a custom stop-word list', () => {
    expect(tokenize('quick brown', { stopWords: new Set(['quick']) })).toEqual(['brown']);
  });

  it('handles blanks safely', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize('!!! ???')).toEqual([]);
  });
});

describe('countTerms', () => {
  it('counts repeated terms across gists', () => {
    const counts = countTerms(['stellar stellar', 'stellar']);
    expect(counts.get('stellar')).toBe(3);
  });

  it('returns an empty map for no content', () => {
    expect(countTerms([]).size).toBe(0);
  });
});

describe('topTerms', () => {
  it('sorts by count, then alphabetically', () => {
    const terms = topTerms(['stellar stellar', 'xenon xenon xenon', 'anchor']);
    expect(terms).toEqual([
      { term: 'xenon', count: 3 },
      { term: 'stellar', count: 2 },
      { term: 'anchor', count: 1 },
    ]);
  });

  it('limits the list to 20 terms by default', () => {
    const contents = Array.from({ length: 30 }, (_, i) => `term${i}`);
    expect(DEFAULT_TERM_LIMIT).toBe(20);
    expect(topTerms(contents)).toHaveLength(20);
  });

  it('accepts a custom limit and ignores negative limits', () => {
    const contents = ['alpha alpha beta beta gamma'];
    expect(topTerms(contents, 2)).toHaveLength(2);
    expect(topTerms(contents, -1)).toHaveLength(0);
  });

  it('handles an empty input', () => {
    expect(topTerms([])).toEqual([]);
  });
});
