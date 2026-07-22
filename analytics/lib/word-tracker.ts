import Papa from 'papaparse';
import { saveAs } from 'file-saver';

export interface WordFrequencyEntry {
  word: string;
  count: number;
  percentage: number;
  firstSeen: string;
  lastSeen: string;
}

export interface WordTimeSeriesEntry {
  date: string;
  words: { word: string; count: number }[];
}

export interface LocationWordEntry {
  location: string;
  words: { word: string; count: number; percentage: number }[];
}

export interface TrendingWord {
  word: string;
  currentCount: number;
  previousCount: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
}

const STOP_WORDS: Set<string> = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
  'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'don', 'should', 'now', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
  'does', 'did', 'doing', 'would', 'could', 'might', 'must', 'shall',
  'may', 'it', 'its', 'he', 'she', 'they', 'them', 'their', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'what', 'which', 'who', 'whom', 'as', 'of', 'into', 'through', 'per',
  'also', 'however', 'while', 'since', 'until', 'unless', 'though',
  'although', 'because', 'whether', 'either', 'neither', 'every',
  'much', 'many', 'well', 'back', 'even', 'still', 'new', 'like',
  'one', 'two', 'use', 'used', 'using', 'make', 'made', 'get', 'got',
  'say', 'said', 'know', 'known', 'think', 'see', 'come', 'go',
  'want', 'look', 'give', 'first', 'way', 'take', 'need', 'feel',
  'thing', 'let', 'keep', 'help', 'show', 'try', 'ask', 'work',
  'seem', 'feel', 'call', 'put', 'end', 'set', 'run', 'move',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

export function analyzeWordFrequency(texts: string[]): WordFrequencyEntry[] {
  const wordCounts = new Map<string, { count: number; firstSeen: string; lastSeen: string }>();
  const totalWords: number[] = [];

  texts.forEach((text, index) => {
    const words = tokenize(text);
    totalWords.push(words.length);
    const dateStr = new Date().toISOString().split('T')[0];

    words.forEach(word => {
      const existing = wordCounts.get(word);
      if (existing) {
        existing.count++;
        existing.lastSeen = dateStr;
      } else {
        wordCounts.set(word, { count: 1, firstSeen: dateStr, lastSeen: dateStr });
      }
    });
  });

  const totalWordCount = totalWords.reduce((sum, c) => sum + c, 0);

  return Array.from(wordCounts.entries())
    .map(([word, data]) => ({
      word,
      count: data.count,
      percentage: totalWordCount > 0 ? (data.count / totalWordCount) * 100 : 0,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getTrendingWords(
  entries: WordFrequencyEntry[],
  period: 'day' | 'week' | 'month' = 'week'
): TrendingWord[] {
  const now = new Date();
  const periodMs = period === 'day' ? 86400000 : period === 'week' ? 604800000 : 2592000000;
  const cutoff = new Date(now.getTime() - periodMs).toISOString().split('T')[0];

  const trending: TrendingWord[] = entries.map(entry => {
    const isRecent = entry.lastSeen >= cutoff;
    const isPrevious = entry.firstSeen < cutoff && entry.lastSeen < cutoff;
    const currentCount = isRecent ? entry.count : 0;
    const previousCount = isPrevious ? entry.count : Math.max(0, entry.count - Math.floor(entry.count * 0.3));
    const changePercent = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : currentCount > 0 ? 100 : 0;

    return {
      word: entry.word,
      currentCount,
      previousCount,
      changePercent,
      direction: changePercent > 10 ? 'up' : changePercent < -10 ? 'down' : 'stable',
    };
  });

  return trending.sort((a, b) => b.changePercent - a.changePercent);
}

export function getLocationWordTrends(
  texts: string[],
  locations: string[]
): LocationWordEntry[] {
  return locations.map((location, index) => {
    const locationText = texts[index] || '';
    const words = tokenize(locationText);
    const counts = new Map<string, number>();

    words.forEach(word => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

    const total = words.length;
    const wordList = Array.from(counts.entries())
      .map(([word, count]) => ({
        word,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { location, words: wordList };
  });
}

export function exportWordData(
  entries: WordFrequencyEntry[],
  format: 'csv' | 'json' = 'csv'
): void {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    saveAs(blob, 'word-frequency-data.json');
    return;
  }

  const csv = Papa.unparse(entries.map(e => ({
    Word: e.word,
    Count: e.count,
    Percentage: e.percentage.toFixed(2) + '%',
    'First Seen': e.firstSeen,
    'Last Seen': e.lastSeen,
  })));

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'word-frequency-data.csv');
}
