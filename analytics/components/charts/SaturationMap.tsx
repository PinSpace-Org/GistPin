'use client';

import { useState, useMemo } from 'react';
import {
  type SpatialCell,
  type SaturationTier,
} from '@/lib/saturation-analysis';
import {
  Compass,
  Layers,
  MapPin,
  TrendingUp,
  Award,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';

interface SaturationMapProps {
  cells: SpatialCell[];
  selectedCell?: SpatialCell | null;
  onSelectCell?: (cell: SpatialCell) => void;
}

export default function SaturationMap({
  cells,
  selectedCell,
  onSelectCell,
}: SaturationMapProps) {
  const [filterRegion, setFilterRegion] = useState<string>('All');
  const [filterTier, setFilterTier] = useState<string>('All');
  const [overlayMode, setOverlayMode] = useState<'saturation' | 'opportunity' | 'demand'>('saturation');

  const regions = useMemo(() => {
    return ['All', ...Array.from(new Set(cells.map((c) => c.region))).sort()];
  }, [cells]);

  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
      const matchRegion = filterRegion === 'All' || c.region === filterRegion;
      const matchTier = filterTier === 'All' || c.tier === filterTier;
      return matchRegion && matchTier;
    });
  }, [cells, filterRegion, filterTier]);

  const getTierColor = (tier: SaturationTier, opacity = 1) => {
    switch (tier) {
      case 'starved':
        return `rgba(239, 68, 68, ${opacity})`; // Red
      case 'under_served':
        return `rgba(245, 158, 11, ${opacity})`; // Amber
      case 'balanced':
        return `rgba(16, 185, 129, ${opacity})`; // Green
      case 'over_saturated':
        return `rgba(99, 102, 241, ${opacity})`; // Indigo
    }
  };

  const getTierBadge = (tier: SaturationTier) => {
    switch (tier) {
      case 'starved':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200';
      case 'under_served':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200';
      case 'balanced':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200';
      case 'over_saturated':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
            <Filter size={14} /> Filters:
          </span>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === 'All' ? 'All Regions' : r}
              </option>
            ))}
          </select>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200"
          >
            <option value="All">All Saturation Tiers</option>
            <option value="starved">Content-Starved (&lt; 0.35)</option>
            <option value="under_served">Under-Served (0.35 - 0.8)</option>
            <option value="balanced">Balanced (0.8 - 1.6)</option>
            <option value="over_saturated">Over-Saturated (&gt; 1.6)</option>
          </select>
        </div>

        {/* Overlay Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold">
          {(['saturation', 'opportunity', 'demand'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setOverlayMode(mode)}
              className={`px-3 py-1 rounded-lg capitalize transition-all ${
                overlayMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              {mode} Heatmap
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Spatial Grid Representation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCells.map((cell) => {
          const isSelected = selectedCell?.id === cell.id;
          const displayValue =
            overlayMode === 'saturation'
              ? `${cell.saturationScore}% Saturation`
              : overlayMode === 'opportunity'
              ? `Opportunity: ${cell.opportunityIndex}/100`
              : `${cell.searchDemandCount.toLocaleString()} Search Demand`;

          return (
            <div
              key={cell.id}
              onClick={() => onSelectCell?.(cell)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-2xs'
              }`}
            >
              {/* Colored top bar based on tier */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: getTierColor(cell.tier) }}
              />

              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      {cell.region}
                    </span>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                      <MapPin size={15} style={{ color: getTierColor(cell.tier) }} />
                      {cell.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getTierBadge(
                      cell.tier
                    )}`}
                  >
                    {cell.tier.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    {overlayMode === 'saturation'
                      ? 'Demand vs Supply Ratio'
                      : overlayMode === 'opportunity'
                      ? 'Deficit Severity'
                      : 'Active User Queries'}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {displayValue}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/20">
                    <span className="text-[10px] text-gray-400 block">Content Pins</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {cell.contentCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/20">
                    <span className="text-[10px] text-gray-400 block">Search Demand</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {cell.searchDemandCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Indicator */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500">
                  Trending: <strong>{cell.topTrendingCategory}</strong>
                </span>

                {cell.creatorIncentiveMultiplier > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] flex items-center gap-1">
                    <Sparkles size={11} /> {cell.creatorIncentiveMultiplier}x Boost
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
