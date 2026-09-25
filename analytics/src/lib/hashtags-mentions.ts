export const HASHTAG_PATTERN = /#([\p{L}\p{N}_]+)/gu;
export const MENTION_PATTERN = /@([\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*)/gu;
export const DEFAULT_TERM_LIMIT = 10;

export interface GroupedTerm {
  term: string;
  count: number;
}

function extract(content: string | null | undefined, pattern: RegExp): string[] {
  if (typeof content !== 'string' || content.length === 0) return [];
  const matches = content.normalize('NFKC').match(pattern);
  if (matches === null) return [];
  return matches.map((match) => match.slice(1));
}

export function extractHashtags(content: string | null | undefined): string[] {
  return extract(content, HASHTAG_PATTERN);
}

export function extractMentions(content: string | null | undefined): string[] {
  return extract(content, MENTION_PATTERN);
}

function group(terms: ReadonlyArray<string>, limit: number): GroupedTerm[] {
  const grouped = new Map<string, { display: string; count: number }>();
  for (const term of terms) {
    const key = term.toLowerCase();
    const existing = grouped.get(key);
    if (existing === undefined) grouped.set(key, { display: term, count: 1 });
    else existing.count += 1;
  }
  return [...grouped.entries()]
    .sort((a, b) => (b[1].count - a[1].count) || a[1].display.localeCompare(b[1].display))
    .slice(0, Math.max(0, limit))
    .map(([, value]) => ({ term: value.display, count: value.count }));
}

export function topHashtags(
  contents: ReadonlyArray<string | null | undefined>,
  limit: number = DEFAULT_TERM_LIMIT,
): GroupedTerm[] {
  return group(
    contents.flatMap((content) => extractHashtags(content)),
    limit,
  );
}

export function topMentions(
  contents: ReadonlyArray<string | null | undefined>,
  limit: number = DEFAULT_TERM_LIMIT,
): GroupedTerm[] {
  return group(
    contents.flatMap((content) => extractMentions(content)),
    limit,
  );
}
