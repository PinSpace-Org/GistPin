'use client';

import { memo, useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateHeatmapData() {
  const now = Date.now();
  const cells: Record<string, number> = {};
  for (let d = 0; d < 30; d++) {
    const day = new Date(now - d * 86_400_000).getDay();
    for (let h = 0; h < 24; h++) {
      const key = `${day}-${h}`;
      cells[key] = (cells[key] ?? 0) + Math.floor(Math.random() * 20);
    }
  }
  return cells;
}

function ActivityHeatmap() {
  const data = useMemo(generateHeatmapData, []);
  const max = Math.max(...Object.values(data));

  const color = (v: number) => {
    const t = v / max;
    if (t === 0) return '#ebedf0';
    if (t < 0.25) return '#9be9a8';
    if (t < 0.5) return '#40c463';
    if (t < 0.75) return '#30a14e';
    return '#216e39';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 text-xs text-gray-500 mb-1 ml-8">
        {HOURS.map((h) => (
          <div key={h} className="w-4 text-center">{h % 6 === 0 ? h : ''}</div>
        ))}
      </div>
      {DAYS.map((day, d) => (
        <div key={day} className="flex items-center gap-1 mb-1">
          <span className="w-7 text-xs text-gray-500 text-right">{day}</span>
          {HOURS.map((h) => {
            const v = data[`${d}-${h}`] ?? 0;
            return (
              <div
                key={h}
                title={`${day} ${h}:00 — ${v} gists`}
                className="w-4 h-4 rounded-sm cursor-default"
                style={{ backgroundColor: color(v) }}
              />
            );
          })}
        </div>
      ))}
      <p className="text-xs text-gray-400 mt-1">Last 30 days · hover for counts</p>
    </div>
  );
}

export default memo(ActivityHeatmap);
