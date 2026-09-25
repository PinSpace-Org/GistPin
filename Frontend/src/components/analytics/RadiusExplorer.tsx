import React, { useState } from 'react';

export interface RadiusExplorerProps {
  initialRadiusKm?: number;
  onRadiusChange?: (radiusKm: number) => void;
}

export const RadiusExplorer: React.FC<RadiusExplorerProps> = ({
  initialRadiusKm = 5,
  onRadiusChange,
}) => {
  const [radius, setRadius] = useState<number>(initialRadiusKm);

  const handleChange = (val: number) => {
    setRadius(val);
    onRadiusChange?.(val);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Radius Spatial Explorer
      </h4>
      <div className="flex items-center gap-4 text-xs">
        <input
          type="range"
          min="1"
          max="50"
          value={radius}
          onChange={e => handleChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold w-12 text-right">
          {radius} km
        </span>
      </div>
    </div>
  );
};

export default RadiusExplorer;
