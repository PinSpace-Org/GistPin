'use client';

import { useMemo } from 'react';

type Sentiment = 'positive' | 'negative' | 'neutral';

export interface WordEntry {
  text: string;
  count: number;
  sentiment: Sentiment;
}

interface WordCloudProps {
  words: WordEntry[];
  selectedWord?: string | null;
  onWordClick?: (word: string) => void;
}

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  neutral:  '#6b7280',
};

export default function WordCloud({ words, selectedWord, onWordClick }: WordCloudProps) {
  const maxCount = useMemo(() => Math.max(...words.map((w) => w.count), 1), [words]);

  return (
    <div className="flex flex-wrap gap-3 items-end justify-center min-h-48 p-4">
      {words.map((word) => {
        const ratio = word.count / maxCount;
        const fontSize = 12 + ratio * 32; // 12px – 44px
        const isSelected = selectedWord === word.text;
        return (
          <button
            key={word.text}
            onClick={() => onWordClick?.(word.text)}
            style={{
              fontSize,
              color: SENTIMENT_COLOR[word.sentiment],
              fontWeight: ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400,
              opacity: selectedWord && !isSelected ? 0.4 : 1,
              outline: isSelected ? `2px solid ${SENTIMENT_COLOR[word.sentiment]}` : 'none',
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
  );
}
