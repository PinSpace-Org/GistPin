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
import { Line } from 'react-chartjs-2';
import {
  Database,
  Globe,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  getPlatformCompletenessScorecard,
  type CompletenessScorecard,
} from '@/lib/completeness-scorer';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function DataCompletenessPage() {
  const [scorecard, setScorecard] = useState<CompletenessScorecard>(() =>
    getPlatformCompletenessScorecard()
  );
  const [backfillingId, setBackfillingId] = useState<string | null>(null);
  const [backfillSuccessMessage, setBackfillSuccessMessage] = useState<string | null>(null);

  const handleTriggerBackfill = (id: string, title: string) => {
    setBackfillingId(id);
    setTimeout(() => {
      setBackfillingId(null);
      setBackfillSuccessMessage(`Successfully queued backfill job for: ${title}`);
      setTimeout(() => setBackfillSuccessMessage(null), 4000);
    }, 1200);
  };

  const trendChartData = useMemo(() => {
    return {
      labels: scorecard.historicalTrend.map((t) => t.date),
      datasets: [
        {
          label: 'Overall Score (%)',
          data: scorecard.historicalTrend.map((t) => t.overallScore),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
        },
        {
          label: 'On-chain Sync Rate (%)',
          data: scorecard.historicalTrend.map((t) => t.syncRate),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: 'IPFS Availability (%)',
          data: scorecard.historicalTrend.map((t) => t.ipfsRate),
          borderColor: '#06b6d4',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: 'Metadata Richness (%)',
          data: scorecard.historicalTrend.map((t) => t.metadataRate),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    };
  }, [scorecard]);

  const trendChartOptions = {
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
        min: 88,
        max: 100,
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: {
          color: '#9ca3af',
          callback: (value: string | number) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Platform Data Completeness Scorecard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Auditing on-chain vs indexed sync status, IPFS blob availability, and metadata integrity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setScorecard(getPlatformCompletenessScorecard())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 shadow-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <RefreshCw size={14} /> Run Fresh Audit
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {backfillSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle size={16} />
          {backfillSuccessMessage}
        </div>
      )}

      {/* Overall Scorecard Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-gray-900 rounded-3xl p-7 lg:p-9 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/15 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md">
              <span className="text-5xl font-black text-emerald-400">
                {scorecard.letterGrade}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                Overall Data Completeness Score
              </div>
              <div className="text-4xl lg:text-5xl font-black mt-1">
                {scorecard.overallScore}%
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Last calculated: {new Date(scorecard.calculatedAt).toLocaleTimeString()} &bull; 99.4% SLA Target
              </p>
            </div>
          </div>

          {/* Three Key Pillar Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="text-xs text-indigo-200 flex items-center justify-between">
                <span>On-Chain Sync</span>
                <Database size={14} className="text-indigo-300" />
              </div>
              <div className="text-2xl font-bold mt-1 text-white">
                {scorecard.syncAudit.syncCompletenessPct}%
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${scorecard.syncAudit.syncCompletenessPct}%` }}
                />
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="text-xs text-indigo-200 flex items-center justify-between">
                <span>IPFS Availability</span>
                <Globe size={14} className="text-indigo-300" />
              </div>
              <div className="text-2xl font-bold mt-1 text-white">
                {scorecard.ipfsAudit.availabilityRatePct}%
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full"
                  style={{ width: `${scorecard.ipfsAudit.availabilityRatePct}%` }}
                />
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="text-xs text-indigo-200 flex items-center justify-between">
                <span>Metadata Coverage</span>
                <Layers size={14} className="text-indigo-300" />
              </div>
              <div className="text-2xl font-bold mt-1 text-white">
                {scorecard.historicalTrend[scorecard.historicalTrend.length - 1].metadataRate}%
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{
                    width: `${scorecard.historicalTrend[scorecard.historicalTrend.length - 1].metadataRate}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Sync Status & IPFS Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* On-Chain vs Indexed Gist Audit */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database size={18} className="text-indigo-600" />
              On-Chain vs Indexed Sync Completeness
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              Synced
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-400 block">On-Chain Events</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">
                {scorecard.syncAudit.onChainTotalEvents.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-400 block">Indexed Gists</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">
                {scorecard.syncAudit.indexedGistsCount.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-400 block">Ledger Lag</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {scorecard.syncAudit.ledgerLag} blocks
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-400 block">Orphan Rate</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">
                {scorecard.syncAudit.orphanRatePct}%
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Soroban Tip Block Height:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                #{scorecard.syncAudit.currentLedgerHeight.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Indexed Ledger:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                #{scorecard.syncAudit.lastIndexedLedgerHeight.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pending Sync Reconciliation:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {scorecard.syncAudit.missingIndexedCount} records
              </span>
            </div>
          </div>
        </div>

        {/* IPFS Content Availability */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe size={18} className="text-cyan-600" />
              IPFS Content & Gateway Availability Rate
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              {scorecard.ipfsAudit.avgRetrievalLatencyMs}ms Avg Latency
            </span>
          </div>

          <div className="space-y-3">
            {scorecard.ipfsAudit.storageProviders.map((sp) => (
              <div
                key={sp.name}
                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      sp.status === 'healthy'
                        ? 'bg-emerald-500'
                        : sp.status === 'degraded'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {sp.name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {sp.pinCount.toLocaleString()} pinned CIDs
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {sp.uptimePct}% uptime
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metadata Completeness Scorecard Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers size={20} className="text-amber-500" />
            Metadata Field Completeness & Schema Audit
          </h2>
          <p className="text-xs text-gray-500">
            Field-by-field completeness rates across 148k+ active gist payloads.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">Metadata Field</th>
                <th className="pb-3 font-bold">Category</th>
                <th className="pb-3 font-bold">Requirement</th>
                <th className="pb-3 font-bold">Completeness Rate</th>
                <th className="pb-3 font-bold">Search Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {scorecard.metadataAudit.map((field) => (
                <tr key={field.fieldName} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-3.5 text-gray-900 dark:text-white font-bold">
                    {field.fieldName}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize text-[11px]">
                      {field.category}
                    </span>
                  </td>
                  <td className="py-3.5">
                    {field.isRequired ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">Mandatory</span>
                    ) : (
                      <span className="text-gray-400">Optional</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            field.completenessPct >= 99
                              ? 'bg-emerald-500'
                              : field.completenessPct >= 90
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${field.completenessPct}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {field.completenessPct}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`font-semibold ${
                        field.impactOnSearch === 'critical'
                          ? 'text-rose-600 dark:text-rose-400'
                          : field.impactOnSearch === 'moderate'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {field.impactOnSearch.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Trend Chart & Missing Data Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 30-Day Trend Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Data Completeness Trend (30 Days)
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Trajectory of continuous sync, IPFS availability, and schema reconciliation.
          </p>
          <div className="h-64 w-full">
            <Line data={trendChartData} options={trendChartOptions} />
          </div>
        </div>

        {/* Missing Data Impact Analysis */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Missing Data Impact Analysis
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Estimated penalty on platform discoverability and user query yield.
            </p>

            <div className="space-y-3">
              {scorecard.impactAnalysis.map((imp) => (
                <div
                  key={imp.domain}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-900 dark:text-white">{imp.domain}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black ${
                        imp.impactLevel === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {imp.impactLevel} Impact
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Lost Queries: <strong>~{imp.estimatedLostQueriesMonthly.toLocaleString()}/mo</strong> &bull; {imp.remediationAction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Action Trigger:</strong> Resolving the high-impact spatial grid gaps will recover ~14,200 monthly near-me map queries.
          </div>
        </div>
      </div>

      {/* Recommended Automated Backfills */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap size={20} className="text-indigo-600" />
            Recommended Automated Data Backfills
          </h2>
          <p className="text-xs text-gray-500">
            Run automated batch jobs to resolve missing coordinate indexes and unpinned IPFS blobs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scorecard.recommendedBackfills.map((bf) => (
            <div
              key={bf.id}
              className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {bf.targetSystem}
                  </span>
                  <span
                    className={`uppercase text-[10px] font-black ${
                      bf.priority === 'urgent' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  >
                    {bf.priority}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-relaxed">
                  {bf.title}
                </h3>
                <div className="text-xs text-gray-400 mt-2">
                  {bf.recordsToProcess.toLocaleString()} records target
                </div>
              </div>

              <button
                type="button"
                disabled={backfillingId === bf.id}
                onClick={() => handleTriggerBackfill(bf.id, bf.title)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {backfillingId === bf.id ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Queuing Job...
                  </>
                ) : (
                  <>
                    <Zap size={14} /> Execute Backfill Job
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
