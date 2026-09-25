import { formatPercent } from './format';

export const MISSING_CONTENT_EXPLANATION =
  'Gists indexed from on-chain events have no content text yet; the indexer stores an empty string until the text arrives.';

export interface MissingContentSummary {
  total: number;
  empty: number;
  share: number | null;
}

export function isEmptyContent(content: string | null | undefined): boolean {
  return typeof content !== 'string' || content.trim().length === 0;
}

export function summarizeMissingContent(
  contents: ReadonlyArray<string | null | undefined>,
): MissingContentSummary {
  const empty = contents.reduce(
    (count, content) => (isEmptyContent(content) ? count + 1 : count),
    0,
  );
  return {
    total: contents.length,
    empty,
    share: contents.length > 0 ? empty / contents.length : null,
  };
}

export function missingContentTooltip(summary: MissingContentSummary): string {
  if (summary.total === 0) return MISSING_CONTENT_EXPLANATION;
  return `${summary.empty} of ${summary.total} loaded gists (${formatPercent(
    summary.share,
  )}) have no stored content. ${MISSING_CONTENT_EXPLANATION}`;
}
