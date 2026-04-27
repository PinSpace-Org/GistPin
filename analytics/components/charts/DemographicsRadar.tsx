'use client';

import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { memo } from 'react';
import { useRadarDataQuery } from '@/lib/analytics-queries';
import ChartSkeleton from '@/components/ui/ChartSkeleton';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function DemographicsRadar() {
  const { data, isLoading, error } = useRadarDataQuery();

  if (isLoading || !data) return <ChartSkeleton />;
  if (error) return <p>Unable to load demographics.</p>;

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.values,
      backgroundColor: i === 0 ? 'rgba(99,102,241,0.25)' : 'rgba(251,146,60,0.25)',
      borderColor: i === 0 ? '#6366f1' : '#fb923c',
      pointBackgroundColor: i === 0 ? '#6366f1' : '#fb923c',
      fill: true,
    })),
  };

  return (
    <div>
      <ExportButton
        onExport={(onProgress) =>
          exportRowsToCsv({
            filenamePrefix: 'demographics-radar',
            filters: {},
            rows: data.labels.map((label, i) => ({
              metric: label,
              this_month: data.datasets[0].values[i],
              last_month: data.datasets[1].values[i],
            })),
            onProgress,
          })
        }
      />
      <Radar data={chartData} options={{ plugins: { tooltip: { enabled: true } } }} />
    </div>
  );
}

export default memo(DemographicsRadar);
