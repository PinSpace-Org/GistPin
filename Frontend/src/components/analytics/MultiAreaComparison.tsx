import React from 'react';

export interface AreaStats {
  areaId: string;
  name: string;
  gistCount: number;
  activeUsers: number;
  densityScore: number;
}

export interface MultiAreaComparisonProps {
  areas?: AreaStats[];
}

export const MultiAreaComparison: React.FC<MultiAreaComparisonProps> = ({
  areas = [],
}) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Multi-Area Spatial Comparison
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {areas.map(area => (
          <div key={area.areaId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">{area.name}</h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Gist Count:</span>
                <span className="font-semibold">{area.gistCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Users:</span>
                <span className="font-semibold">{area.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span>Density Score:</span>
                <span className="font-semibold">{area.densityScore}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiAreaComparison;
