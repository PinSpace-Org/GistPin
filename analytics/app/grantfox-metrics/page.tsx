'use client';

import CampaignDashboard from '@/components/CampaignDashboard';

export default function GrantFoxMetricsPage() {
  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          GrantFox campaign metrics
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Live dashboard for contributor applications, issue completion, PR quality, ROI, and
          leaderboard.
        </p>
      </header>
      <CampaignDashboard />
    </main>
  );
}
