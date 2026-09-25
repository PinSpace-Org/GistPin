import React from 'react';

export interface DensityBin {
  range: string;
  cellCount: number;
}

export interface CellDensityDistributionProps {
  bins?: DensityBin[];
}

export const CellDensityDistribution: React.FC<CellDensityDistributionProps> = ({
  bins = [],
}) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h3 className="text-md font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Geohash Cell Density Distribution
      </h3>
      <div className="space-y-2">
        {bins.map((bin, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-16 font-mono text-gray-500">{bin.range}</span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-4 rounded overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded"
                style={{ width: `${Math.min(100, bin.cellCount * 5)}%` }}
              />
            </div>
            <span className="w-8 text-right font-medium text-gray-700 dark:text-gray-300">
              {bin.cellCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CellDensityDistribution;
