import React, { useState } from 'react';

export interface HeatmapScaleConfig {
  minThreshold: number;
  maxThreshold: number;
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'rose';
}

export interface HeatmapLegendControlsProps {
  initialConfig?: HeatmapScaleConfig;
  onChange?: (config: HeatmapScaleConfig) => void;
}

export const HeatmapLegendControls: React.FC<HeatmapLegendControlsProps> = ({
  initialConfig = { minThreshold: 0, maxThreshold: 100, colorScheme: 'indigo' },
  onChange,
}) => {
  const [config, setConfig] = useState<HeatmapScaleConfig>(initialConfig);

  const handleUpdate = (updated: Partial<HeatmapScaleConfig>) => {
    const next = { ...config, ...updated };
    setConfig(next);
    onChange?.(next);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
        Heatmap Scale Controls
      </h4>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          <span>Min:</span>
          <input
            type="number"
            value={config.minThreshold}
            onChange={e => handleUpdate({ minThreshold: Number(e.target.value) })}
            className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Max:</span>
          <input
            type="number"
            value={config.maxThreshold}
            onChange={e => handleUpdate({ maxThreshold: Number(e.target.value) })}
            className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Palette:</span>
          <select
            value={config.colorScheme}
            onChange={e => handleUpdate({ colorScheme: e.target.value as any })}
            className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="indigo">Indigo</option>
            <option value="emerald">Emerald</option>
            <option value="amber">Amber</option>
            <option value="rose">Rose</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export default HeatmapLegendControls;
