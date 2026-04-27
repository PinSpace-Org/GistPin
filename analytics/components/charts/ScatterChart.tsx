'use client';

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  LineElement,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { memo, useCallback, useState } from 'react';
import { useScatterDataQuery } from '@/lib/analytics-queries';
import { getScatterCategories } from '@/lib/analytics-data';
import { regression } from '@/lib/utils';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';
import ChartSkeleton from '@/components/ui/ChartSkeleton';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, LineElement);

const colors: Record<string, string> = {
  Tech: 'blue',
  Finance: 'green',
  AI: 'purple',
  Web3: 'orange',
};

function ScatterChart() {
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading, error } = useScatterDataQuery();

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value || null);
  }, []);

  if (isLoading || !data) return <ChartSkeleton />;
  if (error) return <p>Unable to load scatter plot.</p>;

  const filtered = category ? data.filter((d) => d.category === category) : data;
  const reg = regression(filtered);

  const scatterData = {
    datasets: [
      {
        label: 'Gists',
        data: filtered.map((d) => ({ x: d.age, y: d.engagement })),
        backgroundColor: filtered.map((d) => colors[d.category]),
      },
      {
        label: 'Trendline',
        data: [
          { x: 0, y: reg.intercept },
          { x: 365, y: reg.slope * 365 + reg.intercept },
        ],
        borderColor: 'red',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
      },
    ],
  };

  return (
    <div>
      <ExportButton
        onExport={(onProgress) =>
          exportRowsToCsv({
            filenamePrefix: 'scatter-chart',
            filters: { category: category ?? 'All' },
            rows: filtered.map((gist) => ({
              id: gist.id,
              age_days: gist.age,
              engagement: gist.engagement,
              category: gist.category,
            })),
            onProgress,
          })
        }
      />
      <select onChange={handleCategoryChange}>
        <option value="">All</option>
        {getScatterCategories().map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <Scatter
        data={scatterData}
        options={{
          onClick: (_, elements) => {
            if (elements.length) alert(`Gist: ${filtered[elements[0].index].id}`);
          },
        }}
      />
    </div>
  );
}

export default memo(ScatterChart);
