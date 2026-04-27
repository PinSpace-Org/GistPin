'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

// ── Types ─────────────────────────────────────────────────────────────────────

type Sentiment = 'positive' | 'neutral' | 'negative';
type Category = 'Performance' | 'UI/UX' | 'Features' | 'Bugs' | 'Support';

interface FeedbackItem {
  id: number;
  text: string;
  sentiment: Sentiment;
  category: Category;
  date: string;
  score: number; // 0–1
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const SENTIMENT_BREAKDOWN = { positive: 58, neutral: 24, negative: 18 };

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
const SENTIMENT_OVER_TIME = {
  positive: [52, 54, 56, 55, 58, 60, 57, 58],
  neutral:  [28, 27, 25, 26, 24, 22, 25, 24],
  negative: [20, 19, 19, 19, 18, 18, 18, 18],
};

const CATEGORY_COUNTS: Record<Category, number> = {
  Performance: 312,
  'UI/UX':     287,
  Features:    241,
  Bugs:        198,
  Support:     142,
};

const WORD_FREQ: { word: string; count: number; sentiment: Sentiment }[] = [
  { word: 'fast',       count: 142, sentiment: 'positive' },
  { word: 'love',       count: 128, sentiment: 'positive' },
  { word: 'map',        count: 115, sentiment: 'neutral'  },
  { word: 'crash',      count: 98,  sentiment: 'negative' },
  { word: 'helpful',    count: 94,  sentiment: 'positive' },
  { word: 'slow',       count: 87,  sentiment: 'negative' },
  { word: 'gist',       count: 82,  sentiment: 'neutral'  },
  { word: 'great',      count: 76,  sentiment: 'positive' },
  { word: 'confusing',  count: 71,  sentiment: 'negative' },
  { word: 'stellar',    count: 65,  sentiment: 'positive' },
  { word: 'location',   count: 61,  sentiment: 'neutral'  },
  { word: 'error',      count: 58,  sentiment: 'negative' },
];

const RECENT_FEEDBACK: FeedbackItem[] = [
  { id: 1, text: 'Love the anonymous posting feature, feels very secure!',    sentiment: 'positive', category: 'Features',    date: '2025-04-26', score: 0.92 },
  { id: 2, text: 'App crashes when I open the map on older devices.',          sentiment: 'negative', category: 'Bugs',        date: '2025-04-25', score: 0.12 },
  { id: 3, text: 'The Stellar tipping is a nice touch.',                       sentiment: 'positive', category: 'Features',    date: '2025-04-25', score: 0.88 },
  { id: 4, text: 'Loading times could be improved on slow connections.',       sentiment: 'neutral',  category: 'Performance', date: '2025-04-24', score: 0.48 },
  { id: 5, text: 'UI is clean but the onboarding is a bit confusing.',         sentiment: 'neutral',  category: 'UI/UX',       date: '2025-04-24', score: 0.45 },
  { id: 6, text: 'Support team was super responsive, resolved my issue fast.', sentiment: 'positive', category: 'Support',     date: '2025-04-23', score: 0.95 },
];

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: 'rgba(34, 197, 94, 0.8)',
  neutral:  'rgba(156, 163, 175, 0.8)',
  negative: 'rgba(239, 68, 68, 0.8)',
};

const SENTIMENT_BADGE: Record<Sentiment, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  neutral:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | 'all'>('all');

  const breakdownData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [SENTIMENT_BREAKDOWN.positive, SENTIMENT_BREAKDOWN.neutral, SENTIMENT_BREAKDOWN.negative],
      backgroundColor: [SENTIMENT_COLORS.positive, SENTIMENT_COLORS.neutral, SENTIMENT_COLORS.negative],
      borderWidth: 1,
    }],
  };

  const trendData = {
    labels: WEEKS,
    datasets: [
      { label: 'Positive', data: SENTIMENT_OVER_TIME.positive, borderColor: 'rgb(34, 197, 94)',   backgroundColor: 'rgba(34, 197, 94, 0.1)',   tension: 0.4, fill: false },
      { label: 'Neutral',  data: SENTIMENT_OVER_TIME.neutral,  borderColor: 'rgb(156, 163, 175)', backgroundColor: 'rgba(156, 163, 175, 0.1)', tension: 0.4, fill: false },
      { label: 'Negative', data: SENTIMENT_OVER_TIME.negative, borderColor: 'rgb(239, 68, 68)',   backgroundColor: 'rgba(239, 68, 68, 0.1)',   tension: 0.4, fill: false },
    ],
  };

  const categoryData = {
    labels: Object.keys(CATEGORY_COUNTS) as Category[],
    datasets: [{
      label: 'Feedback Count',
      data: Object.values(CATEGORY_COUNTS),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

  const filteredFeedback = sentimentFilter === 'all'
    ? RECENT_FEEDBACK
    : RECENT_FEEDBACK.filter((f) => f.sentiment === sentimentFilter);

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Feedback Sentiment</h1>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.entries(SENTIMENT_BREAKDOWN) as [Sentiment, number][]).map(([s, pct]) => (
          <div key={s} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide capitalize">{s}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pct}%</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Sentiment Breakdown</h2>
          <div className="h-56">
            <Doughnut data={breakdownData} options={chartOpts} />
          </div>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Sentiment Over Time</h2>
          <div className="h-56">
            <Line data={trendData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Category + word frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Category Tagging</h2>
          <div className="h-56">
            <Bar data={categoryData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Word Frequency</h2>
          <div className="flex flex-wrap gap-2">
            {WORD_FREQ.map(({ word, count, sentiment }) => (
              <span
                key={word}
                className={`px-2 py-1 rounded text-xs font-medium ${SENTIMENT_BADGE[sentiment]}`}
                style={{ fontSize: `${Math.max(10, Math.min(18, 10 + count / 15))}px` }}
              >
                {word} <span className="opacity-60">({count})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Feedback</h2>
          <div className="flex gap-2">
            {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sentimentFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-start gap-3">
              <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${SENTIMENT_BADGE[item.sentiment]}`}>
                {item.sentiment}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                <p className="text-xs text-gray-400 mt-1">{item.category} · {item.date} · score: {item.score.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
