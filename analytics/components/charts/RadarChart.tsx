'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { memo } from 'react';
import { useRadarDataQuery } from '@/lib/analytics-queries';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';
import ChartSkeleton from '@/components/ui/ChartSkeleton';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Tooltip, Legend);

function RadarChart() {
  const { data, isLoading, error } = useRadarDataQuery();

  if (isLoading || !data) return <ChartSkeleton />;
  if (error) return <p>Unable to load engagement segments.</p>;

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.values,
      backgroundColor: index === 0 ? 'rgba(54,162,235,0.3)' : 'rgba(255,99,132,0.3)',
      borderColor: index === 0 ? 'blue' : 'red',
    })),
  };

  return (
    <div>
      <ExportButton
        onExport={(onProgress) =>
          exportRowsToCsv({
            filenamePrefix: 'radar-chart',
            filters: { comparison: 'This Month vs Last Month' },
            rows: data.labels.map((label, index) => ({
              metric: label,
              this_month: data.datasets[0].values[index],
              last_month: data.datasets[1].values[index],
            })),
            onProgress,
          })
        }
      />
      <Radar data={chartData} />
    </div>
  );
}

export default memo(RadarChart);
