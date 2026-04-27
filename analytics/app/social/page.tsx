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

type Platform = 'Twitter' | 'Instagram' | 'LinkedIn' | 'TikTok';

interface TopPost {
  platform: Platform;
  content: string;
  likes: number;
  shares: number;
  comments: number;
  date: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const FOLLOWER_TRENDS: Record<Platform, number[]> = {
  Twitter:   [12400, 12800, 13100, 13500, 13900, 14200, 14600, 15100],
  Instagram: [8200,  8600,  9100,  9800,  10400, 11000, 11700, 12500],
  LinkedIn:  [5100,  5300,  5400,  5600,  5750,  5900,  6100,  6350],
  TikTok:    [3200,  4100,  5300,  6800,  8200,  9900,  11500, 13200],
};

const ENGAGEMENT_RATES: Record<Platform, number> = {
  Twitter:   3.2,
  Instagram: 5.8,
  LinkedIn:  2.1,
  TikTok:    8.4,
};

const SHARE_OF_VOICE: Record<Platform, number> = {
  Twitter:   34,
  Instagram: 28,
  LinkedIn:  18,
  TikTok:    20,
};

const TOP_POSTS: TopPost[] = [
  { platform: 'TikTok',    content: 'GistPin location drop challenge 🗺️',  likes: 48200, shares: 12400, comments: 3200, date: '2025-04-20' },
  { platform: 'Instagram', content: 'Discover hidden gems near you ✨',      likes: 22100, shares: 4800,  comments: 1890, date: '2025-04-18' },
  { platform: 'Twitter',   content: 'New Stellar integration is live 🚀',    likes: 9800,  shares: 3200,  comments: 780,  date: '2025-04-15' },
  { platform: 'LinkedIn',  content: 'How GistPin is redefining local comms', likes: 4200,  shares: 1100,  comments: 340,  date: '2025-04-12' },
  { platform: 'TikTok',    content: 'Anonymous posting explained 🔒',        likes: 38900, shares: 9700,  comments: 2100, date: '2025-04-10' },
];

const PLATFORM_COLORS: Record<Platform, string> = {
  Twitter:   'rgba(29, 161, 242, 0.85)',
  Instagram: 'rgba(225, 48, 108, 0.85)',
  LinkedIn:  'rgba(10, 102, 194, 0.85)',
  TikTok:    'rgba(0, 0, 0, 0.85)',
};

const PLATFORM_BORDER: Record<Platform, string> = {
  Twitter:   'rgb(29, 161, 242)',
  Instagram: 'rgb(225, 48, 108)',
  LinkedIn:  'rgb(10, 102, 194)',
  TikTok:    'rgb(0, 0, 0)',
};

const PLATFORMS: Platform[] = ['Twitter', 'Instagram', 'LinkedIn', 'TikTok'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function engagementColor(rate: number) {
  if (rate >= 6) return 'text-green-600 dark:text-green-400';
  if (rate >= 3) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const [activePlatforms, setActivePlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));

  function togglePlatform(p: Platform) {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size > 1) next.delete(p); }
      else next.add(p);
      return next;
    });
  }

  const visiblePlatforms = PLATFORMS.filter((p) => activePlatforms.has(p));

  // Follower trend chart
  const followerData = {
    labels: WEEKS,
    datasets: visiblePlatforms.map((p) => ({
      label: p,
      data: FOLLOWER_TRENDS[p],
      borderColor: PLATFORM_BORDER[p],
      backgroundColor: PLATFORM_COLORS[p].replace('0.85', '0.15'),
      tension: 0.4,
      fill: false,
      pointRadius: 3,
    })),
  };

  // Engagement rate bar chart
  const engagementData = {
    labels: visiblePlatforms,
    datasets: [{
      label: 'Engagement Rate (%)',
      data: visiblePlatforms.map((p) => ENGAGEMENT_RATES[p]),
      backgroundColor: visiblePlatforms.map((p) => PLATFORM_COLORS[p]),
      borderColor: visiblePlatforms.map((p) => PLATFORM_BORDER[p]),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // Share of voice doughnut
  const sovData = {
    labels: PLATFORMS,
    datasets: [{
      data: PLATFORMS.map((p) => SHARE_OF_VOICE[p]),
      backgroundColor: PLATFORMS.map((p) => PLATFORM_COLORS[p]),
      borderColor: PLATFORMS.map((p) => PLATFORM_BORDER[p]),
      borderWidth: 1,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } };

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Media Metrics</h1>

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              activePlatforms.has(p)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visiblePlatforms.map((p) => {
          const followers = FOLLOWER_TRENDS[p];
          const latest = followers[followers.length - 1];
          const prev = followers[followers.length - 2];
          const growth = (((latest - prev) / prev) * 100).toFixed(1);
          return (
            <div key={p} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{p}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmt(latest)}</p>
              <p className="text-xs mt-1 text-green-600 dark:text-green-400">+{growth}% this week</p>
              <p className={`text-xs mt-0.5 font-medium ${engagementColor(ENGAGEMENT_RATES[p])}`}>
                {ENGAGEMENT_RATES[p]}% engagement
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Follower Count Trends</h2>
          <div className="h-64">
            <Line data={followerData} options={chartOpts} />
          </div>
        </div>

        {/* Engagement rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Engagement Rate by Platform (%)</h2>
          <div className="h-64">
            <Bar data={engagementData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Share of voice + top posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Share of voice */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Share of Voice</h2>
          <div className="h-56">
            <Doughnut data={sovData} options={chartOpts} />
          </div>
        </div>

        {/* Top posts */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Top Posts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 pr-3">Platform</th>
                  <th className="pb-2 pr-3">Content</th>
                  <th className="pb-2 pr-3 text-right">Likes</th>
                  <th className="pb-2 pr-3 text-right">Shares</th>
                  <th className="pb-2 text-right">Comments</th>
                </tr>
              </thead>
              <tbody>
                {TOP_POSTS.map((post, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {post.platform}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{post.content}</td>
                    <td className="py-2 pr-3 text-right text-gray-900 dark:text-white font-medium">{fmt(post.likes)}</td>
                    <td className="py-2 pr-3 text-right text-gray-900 dark:text-white font-medium">{fmt(post.shares)}</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white font-medium">{fmt(post.comments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
