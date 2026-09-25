import { describe, it, expect } from 'vitest';
import {
  MISSING_CONTENT_EXPLANATION,
  isEmptyContent,
  missingContentTooltip,
  summarizeMissingContent,
} from './missing-content';

describe('isEmptyContent', () => {
  it('treats null, undefined and blank strings as empty', () => {
    expect(isEmptyContent('')).toBe(true);
    expect(isEmptyContent('   \n\t')).toBe(true);
    expect(isEmptyContent(null)).toBe(true);
    expect(isEmptyContent(undefined)).toBe(true);
  });

  it('keeps real content', () => {
    expect(isEmptyContent('hello')).toBe(false);
    expect(isEmptyContent('  padded  ')).toBe(false);
  });
});

describe('summarizeMissingContent', () => {
  it('computes the empty share', () => {
    const summary = summarizeMissingContent(['a', '', null, 'b']);
    expect(summary.total).toBe(4);
    expect(summary.empty).toBe(2);
    expect(summary.share).toBe(0.5);
  });

  it('handles a fully populated set', () => {
    const summary = summarizeMissingContent(['a', 'b']);
    expect(summary.share).toBe(0);
  });

  it('has no share when nothing is loaded', () => {
    expect(summarizeMissingContent([])).toEqual({ total: 0, empty: 0, share: null });
  });
});

describe('missingContentTooltip', () => {
  it('explains the count, share and reason', () => {
    const tooltip = missingContentTooltip(summarizeMissingContent(['a', '']));
    expect(tooltip).toContain('1 of 2');
    expect(tooltip).toContain('50.0%');
    expect(tooltip).toContain(MISSING_CONTENT_EXPLANATION);
  });

  it('still explains the reason when nothing is loaded', () => {
    expect(missingContentTooltip(summarizeMissingContent([]))).toBe(MISSING_CONTENT_EXPLANATION);
  });
});
