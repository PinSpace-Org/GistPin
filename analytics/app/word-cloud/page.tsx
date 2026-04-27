'use client';

import { useMemo, useState } from 'react';
import WordCloud, { type WordEntry } from '@/components/charts/WordCloud';

type Sentiment = 'positive' | 'negative' | 'neutral';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'with', 'this', 'that', 'are', 'was', 'be', 'as', 'by', 'from',
]);

const RAW_WORDS: WordEntry[] = [
  { text: 'amazing', count: 42, sentiment: 'positive' },
  { text: 'location', count: 38, sentiment: 'neutral' },
  { text: 'gist', count: 35, sentiment: 'neutral' },
  { text: 'broken', count: 30, sentiment: 'negative' },
  { text: 'helpful', count: 28, sentiment: 'positive' },
  { text: 'map', count: 26, sentiment: 'neutral' },
  { text: 'slow', count: 24, sentiment: 'negative' },
  { text: 'great', count: 22, sentiment: 'positive' },
  { text: 'community', count: 20, sentiment: 'neutral' },
  { text: 'error', count: 18, sentiment: 'negative' },
  { text: 'love', count: 17, sentiment: 'positive' },
  { text: 'pin', count: 16, sentiment: 'neutral' },
  { text: 'crash', count: 15, sentiment: 'negative' },
  { text: 'fast', count: 14, sentiment: 'positive' },
  { text: 'nearby', count: 13, sentiment: 'neutral' },
  { text: 'useful', count: 12, sentiment: 'positive' },
  { text: 'confusing', count: 11, sentiment: 'negative' },
  { text: 'stellar', count: 10, sentiment: 'positive' },
  { text: 'update', count: 9, sentiment: 'neutral' },
  { text: 'bug', count: 8, sentiment: 'negative' },
  { text: 'discover', count: 7, sentiment: 'positive' },
  { text: 'anonymous', count: 6, sentiment: 'neutral' },
  { text: 'missing', count: 5, sentiment: 'negative' },
  { text: 'explore', count: 5, sentiment: 'positive' },
  { text: 'local', count: 4, sentiment: 'neutral' },
];

const SENTIMENT_BG: Record<Sentiment, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export default function WordCloudPage() {
  const [activeFilter, setActiveFilter] = useState<Sentiment | 'all'>('all');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const words = useMemo(() => RAW_WORDS.filter((w) => !STOP_WORDS.has(w.text)), []);

  const filtered = useMemo(
    () => (activeFilter === 'all' ? words : words.filter((w) => w.sentiment === activeFilter)),
    [words, activeFilter],
  );

  const filteredGists = useMemo(() => {
    if (!selectedWord) return [];
    return [
      `Gist near Market St: "This spot is ${selectedWord}, check it out!"`,
      `Gist in Downtown: "Noticed something ${selectedWord} here today."`,
      `Gist at Central Park: "The vibe is ${selectedWord} around this area."`,
    ];
  }, [selectedWord]);

  const handleWordClick = (word: string) => setSelectedWord((prev) => (prev === word ? null : word));

  return (
    <div className="space-y-6">
      {/* Sentiment filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'positive', 'negative', 'neutral'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Word cloud */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <WordCloud words={filtered} selectedWord={selectedWord} onWordClick={handleWordClick} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(['positive', 'negative', 'neutral'] as Sentiment[]).map((s) => (
          <span key={s} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${SENTIMENT_BG[s]}`}>
            ● {s}
          </span>
        ))}
        <span className="text-xs text-gray-400 self-center">· Word size = frequency · Click to filter gists</span>
      </div>

      {/* Filtered gists */}
      {selectedWord && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Gists containing &ldquo;{selectedWord}&rdquo;
          </h2>
          <ul className="space-y-2">
            {filteredGists.map((g, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-indigo-400 pl-3">
                {g}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setSelectedWord(null)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}

interface WordEntry {
  text: string;
  count: number;
  sentiment: Sentiment;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'with', 'this', 'that', 'are', 'was', 'be', 'as', 'by', 'from',
]);

const RAW_WORDS: WordEntry[] = [
  { text: 'amazing', count: 42, sentiment: 'positive' },
  { text: 'location', count: 38, sentiment: 'neutral' },
  { text: 'gist', count: 35, sentiment: 'neutral' },
  { text: 'broken', count: 30, sentiment: 'negative' },
  { text: 'helpful', count: 28, sentiment: 'positive' },
  { text: 'map', count: 26, sentiment: 'neutral' },
  { text: 'slow', count: 24, sentiment: 'negative' },
  { text: 'great', count: 22, sentiment: 'positive' },
  { text: 'community', count: 20, sentiment: 'neutral' },
  { text: 'error', count: 18, sentiment: 'negative' },
  { text: 'love', count: 17, sentiment: 'positive' },
  { text: 'pin', count: 16, sentiment: 'neutral' },
  { text: 'crash', count: 15, sentiment: 'negative' },
  { text: 'fast', count: 14, sentiment: 'positive' },
  { text: 'nearby', count: 13, sentiment: 'neutral' },
  { text: 'useful', count: 12, sentiment: 'positive' },
  { text: 'confusing', count: 11, sentiment: 'negative' },
  { text: 'stellar', count: 10, sentiment: 'positive' },
  { text: 'update', count: 9, sentiment: 'neutral' },
  { text: 'bug', count: 8, sentiment: 'negative' },
  { text: 'discover', count: 7, sentiment: 'positive' },
  { text: 'anonymous', count: 6, sentiment: 'neutral' },
  { text: 'missing', count: 5, sentiment: 'negative' },
  { text: 'explore', count: 5, sentiment: 'positive' },
  { text: 'local', count: 4, sentiment: 'neutral' },
];

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  neutral: '#6b7280',
};

const SENTIMENT_BG: Record<Sentiment, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export default function WordCloudPage() {
  const [activeFilter, setActiveFilter] = useState<Sentiment | 'all'>('all');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const words = useMemo(
    () => RAW_WORDS.filter((w) => !STOP_WORDS.has(w.text)),
    [],
  );

  const filtered = useMemo(
    () => (activeFilter === 'all' ? words : words.filter((w) => w.sentiment === activeFilter)),
    [words, activeFilter],
  );

  const maxCount = useMemo(() => Math.max(...words.map((w) => w.count)), [words]);

  const filteredGists = useMemo(() => {
    if (!selectedWord) return [];
    return [
      `Gist near Market St: "This spot is ${selectedWord}, check it out!"`,
      `Gist in Downtown: "Noticed something ${selectedWord} here today."`,
      `Gist at Central Park: "The vibe is ${selectedWord} around this area."`,
    ];
  }, [selectedWord]);

  return (
    <div className="space-y-6">
      {/* Sentiment filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'positive', 'negative', 'neutral'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Word cloud */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 min-h-64">
        <div className="flex flex-wrap gap-3 items-end justify-center">
          {filtered.map((word) => {
            const ratio = word.count / maxCount;
            const fontSize = 12 + ratio * 32; // 12px – 44px
            const isSelected = selectedWord === word.text;
            return (
              <button
                key={word.text}
                onClick={() => setSelectedWord(isSelected ? null : word.text)}
                style={{
                  fontSize,
                  color: SENTIMENT_COLORS[word.sentiment],
                  fontWeight: ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400,
                  opacity: selectedWord && !isSelected ? 0.4 : 1,
                  outline: isSelected ? `2px solid ${SENTIMENT_COLORS[word.sentiment]}` : 'none',
                  outlineOffset: 3,
                }}
                className="rounded px-1 transition-opacity hover:opacity-100"
                title={`${word.text}: ${word.count} occurrences (${word.sentiment})`}
              >
                {word.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(['positive', 'negative', 'neutral'] as Sentiment[]).map((s) => (
          <span key={s} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${SENTIMENT_BG[s]}`}>
            ● {s}
          </span>
        ))}
        <span className="text-xs text-gray-400 self-center">· Word size = frequency · Click to filter gists</span>
      </div>

      {/* Filtered gists */}
      {selectedWord && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Gists containing &ldquo;{selectedWord}&rdquo;
          </h2>
          <ul className="space-y-2">
            {filteredGists.map((g, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-indigo-400 pl-3">
                {g}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setSelectedWord(null)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
