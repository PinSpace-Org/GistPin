import React from 'react';

export interface SpreadMetrics {
  totalAreaKm2: number;
  dispersionRadiusKm: number;
  activeBoundingBox: string;
}

export interface GeographicSpreadMetricsProps {
  metrics?: Partial<SpreadMetrics>;
}

export const GeographicSpreadMetrics: React.FC<GeographicSpreadMetricsProps> = ({
  metrics = {},
}) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Geographic Spread Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-gray-500 block">Coverage Area</span>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {metrics.totalAreaKm2 ?? 0} km²
          </span>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-gray-500 block">Dispersion Radius</span>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {metrics.dispersionRadiusKm ?? 0} km
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeographicSpreadMetrics;
