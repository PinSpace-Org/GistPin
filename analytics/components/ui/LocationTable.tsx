'use client';

import Sparkline from '@/components/charts/Sparkline';
import { useLocationDataQuery } from '@/lib/analytics-queries';
import ExportButton from '@/components/ui/ExportButton';
import { exportRowsToCsv } from '@/lib/export';
import { TableSkeleton } from '@/components/ui/ChartSkeleton';

export default function LocationTable() {
  const { data, isLoading, error } = useLocationDataQuery();

  if (isLoading || !data) return <TableSkeleton />;
  if (error) return <p>Unable to load location trends.</p>;

  return (
    <div>
      <ExportButton
        onExport={(onProgress) =>
          exportRowsToCsv({
            filenamePrefix: 'location-table',
            filters: { points_per_location: 7 },
            rows: data.map((row) => ({
              location: row.location,
              ...Object.fromEntries(row.values.map((v, i) => [`day_${i + 1}`, v])),
              direction: row.values.at(-1)! > row.values[0] ? 'up' : 'down',
            })),
            onProgress,
          })
        }
      />
      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.location}>
              <td>{row.location}</td>
              <td>
                <Sparkline data={row.values} />
                {row.values.at(-1)! > row.values[0] ? '↑' : '↓'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
