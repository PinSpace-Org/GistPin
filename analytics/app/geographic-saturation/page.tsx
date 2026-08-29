'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Compass,
  MapPin,
  TrendingUp,
  Target,
  Sparkles,
  Award,
  Layers,
  ArrowUpRight,
  Globe2,
  Users,
  Search,
  CheckCircle2,
} from 'lucide-react';
import SaturationMap from '@/components/charts/SaturationMap';
import {
  getSpatialCells,
  getRegionalSummaries,
  detectOpportunityZones,
  type SpatialCell,
} from '@/lib/saturation-analysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const MONTHS = ['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];

export default function GeographicSaturationPage() {
  const cells = useMemo(() => getSpatialCells(), []);
  const regionalSummaries = useMemo(() => getRegionalSummaries(), []);
  const opportunityZones = useMemo(() => detectOpportunityZones(cells), [cells]);

  const [selectedCell, setSelectedCell] = useState<SpatialCell | null>(cells[2]); // Default to Abuja (Starved zone)

  const totalContent = cells.reduce((s, c) => s + c.contentCount, 0);
  const totalDemand = cells.reduce((s, c) => s + c.searchDemandCount, 0);
  const starvedCount = cells.filter((c) => c.tier === 'starved' || c.tier === 'under_served').length;

  // Regional Trend Line Chart
  const trendData = {
    labels: MONTHS,
    datasets: regionalSummaries.map((reg, idx) => {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
      return {
        label: reg.region,
        data: reg.saturationTrend,
        borderColor: colors[idx % colors.length],
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      };
    }),
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, color: '#6b7280', font: { size: 11, weight: 600 as const } },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        title: { display: true, text: 'Saturation Index (%)' },
        min: 0,
        max: 100,
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: '#9ca3af' },
      },
    },
  };

  // Tier breakdown doughnut
  const tierDoughnutData = {
    labels: ['Content-Starved', 'Under-Served', 'Balanced', 'Over-Saturated'],
    datasets: [
      {
        data: [
          cells.filter((c) => c.tier === 'starved').length,
          cells.filter((c) => c.tier === 'under_served').length,
          cells.filter((c) => c.tier === 'balanced').length,
          cells.filter((c) => c.tier === 'over_saturated').length,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Compass size={26} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Geographic Content Saturation Analyzer
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Identify content-saturated vs content-starved zones to optimize creator incentives and geo-expansion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Content vs Demand</span>
            <Layers size={18} className="text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {(totalContent / totalDemand).toFixed(2)}x
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Global Supply Ratio
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {totalContent.toLocaleString()} pins / {totalDemand.toLocaleString()} searches
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">High Opportunity Zones</span>
            <Target size={18} className="text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{starvedCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              Deficit Identified
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">High user demand with low pin density</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Creator Reward Multiplier</span>
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">Up to 3.5x</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              XLM Bounty
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Incentivizing content creation in starved cells</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Top Starved Hub</span>
            <MapPin size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">Abuja CBD</span>
            <span className="text-xs font-semibold text-rose-600">0.29 Ratio</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">4,800 monthly queries / 1,420 gists</p>
        </div>
      </div>

      {/* Main Interactive Saturation Map & Cell Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe2 size={20} className="text-indigo-600" />
                  Spatial Saturation Grid Map
                </h2>
                <p className="text-xs text-gray-500">
                  Select a cell to drill down into demand metrics and targeted creator incentives.
                </p>
              </div>
            </div>

            <SaturationMap
              cells={cells}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
            />
          </div>
        </div>

        {/* Selected Cell Inspector */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          {selectedCell ? (
            <div className="space-y-5">
              <div>
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {selectedCell.region} Cell Analysis
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  {selectedCell.name}
                </h3>
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  Lat: {selectedCell.coordinates.lat}, Lng: {selectedCell.coordinates.lng}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Saturation Score:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedCell.saturationScore} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Supply / Demand Ratio:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedCell.demandRatio}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Content Density:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedCell.contentDensityPerSqKm} pins/km²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Engagement Yield:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedCell.avgEngagementPerGist} interactions/pin
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Top Trending Category:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedCell.topTrendingCategory}
                  </span>
                </div>
              </div>

              {/* Creator Playbook Card */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 space-y-2">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                  Recommended Creator Growth Playbook
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  {selectedCell.tier === 'starved' || selectedCell.tier === 'under_served'
                    ? `Seed local community bounties with ${selectedCell.creatorIncentiveMultiplier}x XLM multiplier for '${selectedCell.topTrendingCategory}' to capture unmet search demand.`
                    : `Cell is well balanced. Maintain current organic curation cadence.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs">
              Select a cell on the map to inspect saturation details.
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
            Spatial indexing computed via H3 hexagon & PostGIS ST_DWithin clustering.
          </div>
        </div>
      </div>

      {/* Opportunity Zones Ranking Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target size={20} className="text-rose-500" />
            Detected High-ROI Opportunity Zones
          </h2>
          <p className="text-xs text-gray-500">
            Ranked by search deficit and creator reward potential.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">Opportunity Zone</th>
                <th className="pb-3 font-bold">Region</th>
                <th className="pb-3 font-bold">Demand vs Supply</th>
                <th className="pb-3 font-bold">Content Deficit</th>
                <th className="pb-3 font-bold">Opportunity Score</th>
                <th className="pb-3 font-bold">Bounty Boost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {opportunityZones.map((zone) => (
                <tr key={zone.cellId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-3.5 text-gray-900 dark:text-white font-bold">
                    {zone.cellName}
                  </td>
                  <td className="py-3.5 text-gray-500">{zone.region}</td>
                  <td className="py-3.5">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {zone.demandCount.toLocaleString()}
                    </span>{' '}
                    queries vs{' '}
                    <span className="text-gray-900 dark:text-white">
                      {zone.supplyCount.toLocaleString()}
                    </span>{' '}
                    pins
                  </td>
                  <td className="py-3.5 font-bold text-rose-600 dark:text-rose-400">
                    -{zone.deficitCount.toLocaleString()} pins
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${zone.opportunityScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {zone.opportunityScore}/100
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black">
                      {zone.creatorMultiplier}x XLM
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Saturation Trend by Region & Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Regional Saturation Progression (6 Months)
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Tracking supply-demand balance trajectories as creator adoption expands.
          </p>
          <div className="h-64 w-full">
            <Line data={trendData} options={trendOptions} />
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Global Cell Tier Distribution
            </h2>
            <p className="text-xs text-gray-500 mb-4">Breakdown of surveyed spatial zones.</p>
            <div className="h-48 w-full flex items-center justify-center">
              <Doughnut data={tierDoughnutData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            Targeting &ge;75% of global spatial cells in Balanced tier by Q4 2026.
          </div>
        </div>
      </div>
    </div>
  );
}
