'use client';

import { memo, useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartWrapper from '@/components/ui/ChartWrapper';
import {
  generateDecayCurve,
  calculateOptimalTTL,
  getContentTypes,
  getDecayConfig,
  type DecayPoint,
} from '@/lib/decay-model';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const COLORS: Record<string, string> = {
  news:     'rgba(239, 68, 68, 1)',
  food:     'rgba(251, 146, 60, 1)',
  safety:   'rgba(234, 179, 8, 1)',
  transit:  'rgba(59, 130, 246, 1)',
  events:   'rgba(168, 85, 247, 1)',
  tech:     'rgba(34, 197, 94, 1)',
  finance:  'rgba(20, 184, 166, 1)',
  other:    'rgba(107, 114, 128, 1)',
};

const BG_COLORS: Record<string, string> = {
  news:     'rgba(239, 68, 68, 0.1)',
  food:     'rgba(251, 146, 60, 0.1)',
  safety:   'rgba(234, 179, 8, 0.1)',
  transit:  'rgba(59, 130, 246, 0.1)',
  events:   'rgba(168, 85, 247, 0.1)',
  tech:     'rgba(34, 197, 94, 0.1)',
  finance:  'rgba(20, 184, 166, 0.1)',
  other:    'rgba(107, 114, 128, 0.1)',
};

interface EngagementDecayProps {
  selectedTypes?: string[];
  maxHours?: number;
}

function EngagementDecay({ selectedTypes, maxHours = 72 }: EngagementDecayProps) {
  const contentTypes = useMemo(() => selectedTypes || getContentTypes(), [selectedTypes]);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const decayData = useMemo(() => {
    const data: Record<string, DecayPoint[]> = {};
    for (const ct of contentTypes) {
      data[ct] = generateDecayCurve(ct, maxHours);
    }
    return data;
  }, [contentTypes, maxHours]);

  const halfLives = useMemo(() => {
    return contentTypes.map((ct) => ({
      type: ct,
      halfLife: getDecayConfig(ct).halfLife,
      optimalTTL: Math.round(calculateOptimalTTL(getDecayConfig(ct).halfLife)),
    }));
  }, [contentTypes]);

  const chartData = useMemo(() => {
    const labels = decayData[contentTypes[0]]?.map((p) => `${p.hours}h`) || [];

    return {
      labels,
      datasets: contentTypes.map((ct) => ({
        label: ct.charAt(0).toUpperCase() + ct.slice(1),
        data: decayData[ct]?.map((p) => p.engagement) || [],
        borderColor: COLORS[ct] || COLORS.other,
        backgroundColor: BG_COLORS[ct] || BG_COLORS.other,
        borderWidth: hoveredType === ct ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      })),
    };
  }, [decayData, contentTypes, hoveredType]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      animation: { duration: 600 },
      scales: {
        x: {
          title: { display: true, text: 'Hours Since Post', font: { size: 12 } },
          grid: { display: false },
          ticks: {
            maxTicksLimit: 12,
            font: { size: 10 },
          },
        },
        y: {
          title: { display: true, text: 'Engagement (%)', font: { size: 12 } },
          min: 0,
          max: 100,
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => `Hours since post: ${items[0].label}`,
            label: (item: TooltipItem<'line'>) =>
              `  ${item.dataset.label}: ${(item.raw as number).toFixed(1)}%`,
          },
        },
      },
      onHover: (_: unknown, elements: Array<{ datasetIndex: number }>) => {
        if (elements.length > 0) {
          const idx = elements[0].datasetIndex;
          setHoveredType(contentTypes[idx] || null);
        } else {
          setHoveredType(null);
        }
      },
    }),
    [contentTypes]
  );

  return (
    <ChartWrapper title="Gist Engagement Decay Curves">
      <div style={{ height: 360 }}>
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {halfLives.map((h) => (
          <div
            key={h.type}
            className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-center"
          >
            <div className="text-xs font-medium text-gray-500">
              {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
            </div>
            <div className="text-sm font-bold" style={{ color: COLORS[h.type] }}>
              t½ = {h.halfLife}h
            </div>
            <div className="text-[10px] text-gray-400">
              TTL: {h.optimalTTL}h
            </div>
          </div>
        ))}
      </div>
    </ChartWrapper>
  );
}

export default memo(EngagementDecay);
