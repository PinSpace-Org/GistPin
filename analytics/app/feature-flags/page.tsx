'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;       // 0–100 %
  adoptionRate: number;  // % of eligible users who used it
  users: number;
  createdAt: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_FLAGS: FeatureFlag[] = [
  { id: 'geo-fence-v2',    name: 'Geo-Fence V2',         description: 'Improved polygon geo-fencing engine',    enabled: true,  rollout: 100, adoptionRate: 78.4, users: 12400, createdAt: '2025-03-01' },
  { id: 'stellar-tips',    name: 'Stellar Tips',          description: 'Micropayment tipping via Stellar',       enabled: true,  rollout: 60,  adoptionRate: 42.1, users: 7500,  createdAt: '2025-03-15' },
  { id: 'dark-mode',       name: 'Dark Mode',             description: 'System-aware dark theme',                enabled: true,  rollout: 100, adoptionRate: 91.2, users: 15800, createdAt: '2025-02-10' },
  { id: 'ipfs-upload',     name: 'IPFS Media Upload',     description: 'Attach media stored on IPFS',           enabled: false, rollout: 0,   adoptionRate: 0,    users: 0,     createdAt: '2025-04-01' },
  { id: 'anon-verify',     name: 'Anonymous Verification',description: 'Optional cryptographic identity proof',  enabled: true,  rollout: 25,  adoptionRate: 18.7, users: 2900,  createdAt: '2025-04-10' },
  { id: 'collab-gists',    name: 'Collaborative Gists',   description: 'Multi-author gist editing',              enabled: false, rollout: 5,   adoptionRate: 3.2,  users: 480,   createdAt: '2025-04-20' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);
  const [editingRollout, setEditingRollout] = useState<string | null>(null);

  function toggleFlag(id: string) {
    setFlags((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled, rollout: !f.enabled ? f.rollout || 10 : f.rollout } : f
      )
    );
  }

  function setRollout(id: string, value: number) {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, rollout: value } : f))
    );
  }

  const activeFlags = flags.filter((f) => f.enabled);

  const adoptionData = {
    labels: activeFlags.map((f) => f.name),
    datasets: [
      {
        label: 'Rollout %',
        data: activeFlags.map((f) => f.rollout),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Adoption %',
        data: activeFlags.map((f) => f.adoptionRate),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <main className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Flags',  value: flags.length },
          { label: 'Active',       value: flags.filter((f) => f.enabled).length },
          { label: 'In Rollout',   value: flags.filter((f) => f.enabled && f.rollout < 100).length },
          { label: 'Disabled',     value: flags.filter((f) => !f.enabled).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Adoption chart */}
      {activeFlags.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Rollout vs Adoption (active flags)</h2>
          <div className="h-64">
            <Bar
              data={adoptionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { max: 100, ticks: { callback: (v) => `${v}%` } } },
              }}
            />
          </div>
        </div>
      )}

      {/* Flags list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">All Flags</h2>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {flags.map((flag) => (
            <div key={flag.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{flag.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    flag.enabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {flag.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{flag.description}</p>
                {flag.enabled && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {flag.users.toLocaleString()} users · {flag.adoptionRate}% adoption
                  </p>
                )}
              </div>

              {/* Rollout slider */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">{flag.rollout}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={flag.rollout}
                  disabled={!flag.enabled}
                  onChange={(e) => setRollout(flag.id, Number(e.target.value))}
                  className="flex-1 accent-indigo-600 disabled:opacity-40"
                  aria-label={`Rollout percentage for ${flag.name}`}
                />
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleFlag(flag.id)}
                aria-pressed={flag.enabled}
                aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.name}`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  flag.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    flag.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
