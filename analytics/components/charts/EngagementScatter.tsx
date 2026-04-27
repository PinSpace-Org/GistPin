'use client';

import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { memo, useCallback, useState } from 'react';
import { useScatterDataQuery } from '@/lib/analytics-queries';
import { getScatterCategories } from '@/lib/analytics-data';
import { regression } from '@/lib/utils';
import ChartSkeleton from '@/components/ui/ChartSkeleton';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const COLORS: Record<string, string> = { Tech: '#6366f1', Finance: '#16a34a', AI: '#9333ea', Web3: '#f97316' };

function EngagementScatter() {
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading, error } = useScatterDataQuery();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value || null);
  }, []);

  if (isLoading || !data) return <ChartSkeleton />;
  if (error) return <p>Unable to load scatter data.</p>;

  const filtered = category ? data.filter((d) => d.category === category) : data;
  const reg = regression(filtered);

  const chartData = {
    datasets: [
      {
        label: 'Gists',
        data: filtered.map((d) => ({ x: d.age, y: d.engagement })),
        backgroundColor: filtered.map((d) => COLORS[d.category] ?? '#888'),
        pointRadius: 4,
      },
      {
        label: 'Regression',
        data: [{ x: 0, y: reg.intercept }, { x: 365, y: reg.slope * 365 + reg.intercept }],
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
      },
    ],
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <select className="text-sm border rounded px-2 py-1" onChange={handleChange}>
          <option value="">All categories</option>
          {getScatterCategories().map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ExportButton
          onExport={(onProgress) =>
            exportRowsToCsv({
              filenamePrefix: 'engagement-scatter',
              filters: { category: category ?? 'All' },
              rows: filtered.map((d) => ({ id: d.id, age_days: d.age, engagement: d.engagement, category: d.category })),
              onProgress,
            })
          }
        />
      </div>
      <Scatter
        data={chartData}
        options={{
          plugins: { tooltip: { callbacks: { label: (ctx) => `Age: ${ctx.parsed.x}d, Engagement: ${ctx.parsed.y}` } } },
          onClick: (_, elements) => {
            if (elements.length) {
              const d = filtered[elements[0].index];
              alert(`ID: ${d.id}\nCategory: ${d.category}\nAge: ${d.age} days\nEngagement: ${d.engagement}`);
            }
          },
        }}
      />
    </div>
  );
}

export default memo(EngagementScatter);
