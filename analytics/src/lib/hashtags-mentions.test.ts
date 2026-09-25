import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TERM_LIMIT,
  extractHashtags,
  extractMentions,
  topHashtags,
  topMentions,
} from './hashtags-mentions';

describe('extractHashtags', () => {
  it('extracts hashtags without the marker', () => {
    expect(extractHashtags('loving #stellar and #soroban')).toEqual(['stellar', 'soroban']);
  });

  it('handles punctuation and unicode tags', () => {
    expect(extractHashtags('#stellar, #soroban! (#café)')).toEqual([
      'stellar',
      'soroban',
      'café',
    ]);
  });

  it('ignores a bare hash and empty content', () => {
    expect(extractHashtags('# hello')).toEqual([]);
    expect(extractHashtags('')).toEqual([]);
    expect(extractHashtags(null)).toEqual([]);
  });
});

describe('extractMentions', () => {
  it('extracts mentions without the marker', () => {
    expect(extractMentions('hi @alice and @bob_1')).toEqual(['alice', 'bob_1']);
  });

  it('handles punctuation and unicode handles', () => {
    expect(extractMentions('@alice, @bob. @josé — end')).toEqual(['alice', 'bob', 'josé']);
  });

  it('ignores a bare at-sign and empty content', () => {
    expect(extractMentions('@ nope')).toEqual([]);
    expect(extractMentions(undefined)).toEqual([]);
  });
});

describe('topHashtags', () => {
  it('groups case-insensitively, keeping the first spelling', () => {
    expect(topHashtags(['#Stellar #stellar', '#STELLAR'])).toEqual([
      { term: 'Stellar', count: 3 },
    ]);
  });

  it('sorts by count then alphabetically', () => {
    expect(topHashtags(['#b #a', '#c'])).toEqual([
      { term: 'a', count: 1 },
      { term: 'b', count: 1 },
      { term: 'c', count: 1 },
    ]);
  });

  it('defaults to the top 10', () => {
    const contents = Array.from({ length: 15 }, (_, i) => `#tag${i}`);
    expect(DEFAULT_TERM_LIMIT).toBe(10);
    expect(topHashtags(contents)).toHaveLength(10);
  });

  it('handles no hashtags', () => {
    expect(topHashtags(['plain text', null])).toEqual([]);
  });
});

describe('topMentions', () => {
  it('groups case-insensitively across gists', () => {
    expect(topMentions(['@Alice', '@alice', '@bob'])).toEqual([
      { term: 'Alice', count: 2 },
      { term: 'bob', count: 1 },
    ]);
  });

  it('accepts a custom limit', () => {
    expect(topMentions(['@a @b @c'], 2)).toHaveLength(2);
    expect(topMentions(['@a'], -1)).toEqual([]);
  });
});
