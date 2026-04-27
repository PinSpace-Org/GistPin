'use client';

import { memo } from 'react';
import { useLocationDataQuery } from '@/lib/analytics-queries';
import Sparkline from '@/components/charts/Sparkline';
import ChartSkeleton from '@/components/ui/ChartSkeleton';

function TopLocationsTable() {
  const { data, isLoading, error } = useLocationDataQuery();

  if (isLoading || !data) return <ChartSkeleton />;
  if (error) return <p>Unable to load locations.</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="pb-2">Location</th>
          <th className="pb-2">7-day trend</th>
          <th className="pb-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {data.map(({ location, values }) => {
          const total = values.reduce((s, v) => s + v, 0);
          const trendUp = values[values.length - 1] >= values[0];
          return (
            <tr key={location} className="border-b last:border-0">
              <td className="py-2">{location}</td>
              <td className="py-2">
                <Sparkline data={values} />
              </td>
              <td className={`py-2 text-right font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
                {total}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default memo(TopLocationsTable);
