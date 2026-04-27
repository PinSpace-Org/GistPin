export type Sentiment = 'positive' | 'neutral' | 'negative';

const POSITIVE_WORDS = new Set([
  'love', 'great', 'fast', 'helpful', 'amazing', 'excellent', 'good', 'best',
  'awesome', 'fantastic', 'easy', 'smooth', 'perfect', 'stellar', 'useful',
]);

const NEGATIVE_WORDS = new Set([
  'crash', 'slow', 'error', 'bug', 'broken', 'confusing', 'bad', 'terrible',
  'awful', 'missing', 'fail', 'issue', 'problem', 'wrong', 'annoying',
]);

/** Naive keyword-based sentiment scorer. Returns a score in [0, 1] and a label. */
export function scoreSentiment(text: string): { score: number; sentiment: Sentiment } {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let pos = 0;
  let neg = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) pos++;
    if (NEGATIVE_WORDS.has(word)) neg++;
  }

  const total = pos + neg;
  if (total === 0) return { score: 0.5, sentiment: 'neutral' };

  const score = pos / total;
  const sentiment: Sentiment = score >= 0.6 ? 'positive' : score <= 0.4 ? 'negative' : 'neutral';
  return { score, sentiment };
}

/** Aggregate an array of texts into a breakdown object. */
export function aggregateSentiments(texts: string[]): Record<Sentiment, number> {
  const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const text of texts) {
    counts[scoreSentiment(text).sentiment]++;
  }
  return counts;
}

/** Extract word frequencies from an array of texts, excluding stop words. */
export function wordFrequency(texts: string[], topN = 20): { word: string; count: number }[] {
  const STOP = new Set(['the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'with', 'this', 'that', 'are', 'was', 'be', 'as', 'by', 'from', 'i', 'my', 'me', 'we', 'our']);
  const freq: Record<string, number> = {};

  for (const text of texts) {
    for (const word of text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)) {
      if (word.length > 2 && !STOP.has(word)) {
        freq[word] = (freq[word] ?? 0) + 1;
      }
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}
