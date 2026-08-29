'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Coins,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Zap,
  ShieldAlert,
  ArrowDownRight,
  Sliders,
  CheckCircle,
  HelpCircle,
  Percent,
} from 'lucide-react';
import {
  getTierCostSummaries,
  getSampleWalletProfiles,
  getTierHistoricalCostTrend,
  FEE_OPTIMIZATIONS,
  type WalletBurdenProfile,
  type WalletTier,
} from '@/lib/fee-burden-analysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function FeeBurdenPage() {
  const tierSummaries = useMemo(() => getTierCostSummaries(), []);
  const sampleWallets = useMemo(() => getSampleWalletProfiles(), []);
  const trendData = useMemo(() => getTierHistoricalCostTrend(), []);

  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [activeOptimizations, setActiveOptimizations] = useState<string[]>([
    'tx_batching',
    'sponsored_channels',
  ]);

  // Filtered sample wallets
  const filteredWallets = useMemo(() => {
    if (selectedTierFilter === 'all') return sampleWallets;
    if (selectedTierFilter === 'high_burden_only') return sampleWallets.filter((w) => w.isHighBurden);
    return sampleWallets.filter((w) => w.tier === selectedTierFilter);
  }, [sampleWallets, selectedTierFilter]);

  // Overall metrics
  const totalWallets = tierSummaries.reduce((s, t) => s + t.walletCount, 0);
  const totalHighBurdenWallets = tierSummaries.reduce(
    (s, t) => s + Math.round((t.walletCount * t.highBurdenRatePct) / 100),
    0
  );

  // Fee Trend Line Chart
  const costTrendChartData = {
    labels: trendData.months,
    datasets: [
      {
        label: 'Micro-Posters Fee Burden (%)',
        data: trendData.microPostersBurden,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3,
      },
      {
        label: 'Casual Consumers (%)',
        data: trendData.casualBurden,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      },
      {
        label: 'Regular Creators (%)',
        data: trendData.regularPosterBurden,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      },
      {
        label: 'High-Freq Curators (%)',
        data: trendData.curatorsBurden,
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      },
    ],
  };

  const costTrendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, color: '#6b7280', font: { size: 11, weight: 600 as const } },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        title: { display: true, text: 'Fee as % of Volume' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: {
          color: '#9ca3af',
          callback: (value: string | number) => `${value}%`,
        },
      },
    },
  };

  // Cost vs Benefit Bar Chart
  const costBenefitBarData = {
    labels: tierSummaries.map((t) => t.label),
    datasets: [
      {
        label: 'Avg Fee Burden %',
        data: tierSummaries.map((t) => t.avgFeeBurdenPct),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'High-Burden % Rate',
        data: tierSummaries.map((t) => t.highBurdenRatePct),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const costBenefitBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, color: '#6b7280' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          maxRotation: 20,
          minRotation: 20,
        },
      },
      y: {
        title: { display: true, text: 'Percentage (%)' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: '#9ca3af' },
      },
    },
  };

  const toggleOptimization = (id: string) => {
    setActiveOptimizations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate simulated monthly savings
  const simulatedSavingsPct = useMemo(() => {
    let total = 0;
    for (const id of activeOptimizations) {
      const opt = FEE_OPTIMIZATIONS.find((o) => o.id === id);
      if (opt) total += opt.potentialFeeReductionPct * 0.4;
    }
    return Math.min(85, Math.round(total));
  }, [activeOptimizations]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400">
              <Coins size={26} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Wallet Transaction Cost Burden Analyzer
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analyze how much XLM wallets spend on fees relative to activity, detect high-burden participants, and unlock batch optimizations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Network Fee Burden</span>
            <Percent size={18} className="text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">2.8%</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              -0.6% vs Q1
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Fee as percentage of total transacted volume</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">High-Burden Wallets</span>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {totalHighBurdenWallets.toLocaleString()}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              &gt;8% Burden
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Primarily micro-posters & new onboarded users</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Monthly Fees Paid</span>
            <Coins size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">4,820 XLM</span>
            <span className="text-xs font-semibold text-gray-400">~$433 USD</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Across 17,500+ active creator wallets</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated Savings Potential</span>
            <Sparkles size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {simulatedSavingsPct}%
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              Via Batching
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Estimated ~2,950 XLM saved per month</p>
        </div>
      </div>

      {/* Activity Tier Cost Breakdown Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Coins size={20} className="text-amber-500" />
            Fee Burden by Activity Tier
          </h2>
          <p className="text-xs text-gray-500">
            Comparing transaction fee burden and high-burden rates across user tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">Activity Tier</th>
                <th className="pb-3 font-bold">Active Wallets</th>
                <th className="pb-3 font-bold">Avg Transactions</th>
                <th className="pb-3 font-bold">Avg Fee / Tx</th>
                <th className="pb-3 font-bold">Fee Burden %</th>
                <th className="pb-3 font-bold">High-Burden Rate</th>
                <th className="pb-3 font-bold">Recommended Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {tierSummaries.map((tier) => (
                <tr key={tier.tier} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-3.5 text-gray-900 dark:text-white font-bold">
                    {tier.label}
                  </td>
                  <td className="py-3.5 text-gray-600 dark:text-gray-300">
                    {tier.walletCount.toLocaleString()}
                  </td>
                  <td className="py-3.5">{tier.avgTxCount} txs</td>
                  <td className="py-3.5 font-mono">{tier.avgFeePerTxXlm} XLM</td>
                  <td className="py-3.5">
                    <span
                      className={`font-black ${
                        tier.avgFeeBurdenPct > 5
                          ? 'text-rose-600 dark:text-rose-400'
                          : tier.avgFeeBurdenPct > 2
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {tier.avgFeeBurdenPct}%
                    </span>
                  </td>
                  <td className="py-3.5 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        tier.highBurdenRatePct > 20
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {tier.highBurdenRatePct}%
                    </span>
                  </td>
                  <td className="py-3.5 text-gray-500 max-w-xs truncate">
                    {tier.topRecommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost vs Benefit & Historical Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Cost Burden & High-Burden Rate by Tier
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Micro-posters face disproportionate fee burden due to low per-transaction transaction value.
          </p>
          <div className="h-64 w-full">
            <Bar data={costBenefitBarData} options={costBenefitBarOptions} />
          </div>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Fee Burden Trajectory (6 Months)
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Downward trend across tiers enabled by incremental client-side batching optimizations.
          </p>
          <div className="h-64 w-full">
            <Line data={costTrendChartData} options={costTrendChartOptions} />
          </div>
        </div>
      </div>

      {/* Fee Optimization Simulator */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-6 lg:p-8 text-white border border-indigo-900/50 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              Interactive Fee Optimization Simulator
            </h2>
            <p className="text-xs text-indigo-200">
              Toggle network optimization strategies to simulate projected network fee reductions.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-3">
            <span className="text-xs text-indigo-200">Projected Fee Reduction:</span>
            <span className="text-2xl font-black text-emerald-400">-{simulatedSavingsPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEE_OPTIMIZATIONS.map((opt) => {
            const isActive = activeOptimizations.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => toggleOptimization(opt.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400">
                      -{opt.potentialFeeReductionPct}% Fees
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isActive ? 'bg-indigo-500 text-white' : 'bg-white/10'
                      }`}
                    >
                      {isActive ? '✓' : ''}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-1.5">{opt.name}</h3>
                  <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="text-[10px] text-indigo-300 pt-2 border-t border-white/10">
                  Target: {opt.applicability}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* High-Burden Wallets Detection Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-500" />
              High-Burden Wallet Detection & Optimization Insights
            </h2>
            <p className="text-xs text-gray-500">
              Wallets paying high fee ratios relative to transacted value or earnings.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl text-xs font-semibold">
            {['all', 'high_burden_only', 'micro_poster', 'curator_power'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedTierFilter(f)}
                className={`px-3 py-1.5 rounded-xl transition-all capitalize ${
                  selectedTierFilter === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">Stellar Wallet</th>
                <th className="pb-3 font-bold">Tier</th>
                <th className="pb-3 font-bold">Balance</th>
                <th className="pb-3 font-bold">Txs & Fees</th>
                <th className="pb-3 font-bold">Fee Burden %</th>
                <th className="pb-3 font-bold">Net Benefit & ROI</th>
                <th className="pb-3 font-bold">Custom Optimization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {filteredWallets.map((w) => (
                <tr key={w.address} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-3.5 font-mono text-gray-900 dark:text-white font-bold">
                    {w.address}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize text-[11px]">
                      {w.tier.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono">{w.balanceXlm} XLM</td>
                  <td className="py-3.5">
                    <span className="text-gray-900 dark:text-white font-bold">{w.totalTransactions} txs</span>
                    <span className="text-gray-400 block font-mono text-[11px]">
                      {w.totalFeesPaidXlm} XLM total
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`font-black ${
                        w.feeBurdenPct > 8
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {w.feeBurdenPct}%
                    </span>
                    {w.isHighBurden && (
                      <span className="block text-[10px] text-rose-500 font-extrabold">
                        HIGH BURDEN
                      </span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{w.costVsBenefit.netBenefitXlm} XLM
                    </span>
                    <span className="text-gray-400 block text-[11px]">
                      {w.costVsBenefit.roiMultiple}x ROI
                    </span>
                  </td>
                  <td className="py-3.5 max-w-xs">
                    <div className="space-y-1">
                      {w.recommendedOptimizations.map((rec, i) => (
                        <span
                          key={i}
                          className="block text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md truncate"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
