'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { memo } from 'react';
import { useCategoryDataQuery } from '@/lib/analytics-queries';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';
import ChartSkeleton from '@/components/ui/ChartSkeleton';

ChartJS.register(ArcElement, Tooltip, Legend);

function CategoryPieChart() {
  const { data: categories, isLoading, error } = useCategoryDataQuery();

  if (isLoading || !categories) return <ChartSkeleton />;
  if (error) return <p>Unable to load category distribution.</p>;

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  const data = {
    labels: categories.map((c) => c.label),
    datasets: [
      {
        data: categories.map((c) => c.count),
        backgroundColor: categories.map((c) => c.color),
        borderColor: categories.map((c) => c.border),
        borderWidth: 2,
        hoverOffset: 16,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyleWidth: 10,
          generateLabels: (chart: ChartJS) => {
            const dataset = chart.data.datasets[0];
            return (chart.data.labels as string[]).map((label, i) => {
              const value = dataset.data[i] as number;
              const pct = ((value / total) * 100).toFixed(1);
              return {
                text: `${label} (${pct}%)`,
                fillStyle: (dataset.backgroundColor as string[])[i],
                strokeStyle: (dataset.borderColor as string[])[i],
                hidden: !chart.getDataVisibility(i),
                index: i,
                datasetIndex: 0,
                lineWidth: 2,
                pointStyle: 'circle' as const,
              };
            });
          },
        },
        onClick: (_e: unknown, legendItem: { index?: number }, legend: { chart: ChartJS }) => {
          const index = legendItem.index ?? 0;
          legend.chart.toggleDataVisibility(index);
          legend.chart.update();
        },
      },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'pie'>) => {
            const value = item.raw as number;
            const pct = ((value / total) * 100).toFixed(1);
            return `  ${item.label}: ${value} gists (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <ExportButton
        onExport={(onProgress) =>
          exportRowsToCsv({
            filenamePrefix: 'category-distribution',
            filters: { dataset: 'All categories' },
            rows: categories.map((c) => ({
              category: c.label,
              count: c.count,
              percentage: ((c.count / total) * 100).toFixed(1),
            })),
            onProgress,
          })
        }
      />
      <Pie data={data} options={options} />
    </div>
  );
}

export default memo(CategoryPieChart);
