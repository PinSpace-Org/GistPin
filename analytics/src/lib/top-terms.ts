export const TOKEN_PATTERN = /[\p{L}\p{N}_]+/gu;
export const DEFAULT_MIN_TERM_LENGTH = 3;
export const DEFAULT_TERM_LIMIT = 20;

export const DEFAULT_STOP_WORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'had',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'who',
  'boy',
  'did',
  'get',
  'let',
  'put',
  'say',
  'she',
  'too',
  'use',
  'this',
  'that',
  'with',
  'from',
  'they',
  'have',
  'been',
  'were',
  'your',
  'their',
  'there',
  'them',
  'then',
  'than',
  'what',
  'when',
  'where',
  'which',
  'while',
  'would',
  'about',
  'after',
  'before',
]);

export interface TermCount {
  term: string;
  count: number;
}

export interface TokenizeOptions {
  stopWords?: Iterable<string>;
  minLength?: number;
}

export function tokenize(
  content: string | null | undefined,
  options: TokenizeOptions = {},
): string[] {
  if (typeof content !== 'string' || content.length === 0) return [];
  const stopWords = new Set(options.stopWords ?? DEFAULT_STOP_WORDS);
  const minLength = options.minLength ?? DEFAULT_MIN_TERM_LENGTH;
  const matches = content.normalize('NFKC').toLowerCase().match(TOKEN_PATTERN);
  if (matches === null) return [];
  return matches.filter((term) => term.length >= minLength && !stopWords.has(term));
}

export function countTerms(
  contents: ReadonlyArray<string | null | undefined>,
  options: TokenizeOptions = {},
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const content of contents) {
    for (const term of tokenize(content, options)) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return counts;
}

export function topTerms(
  contents: ReadonlyArray<string | null | undefined>,
  limit: number = DEFAULT_TERM_LIMIT,
  options: TokenizeOptions = {},
): TermCount[] {
  const entries = [...countTerms(contents, options).entries()];
  entries.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return entries.slice(0, Math.max(0, limit)).map(([term, count]) => ({ term, count }));
}
