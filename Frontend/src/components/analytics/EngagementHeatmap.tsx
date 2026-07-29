import React from 'react';
export default function EngagementHeatmap() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Engagement by Time of Day (UTC)</h2>
      <div className="grid grid-cols-6 gap-1 mt-4">
        {[...Array(24)].map((_, i) => {
          const intensity = [20, 10, 5, 5, 10, 30, 50, 70, 90, 100, 80, 70, 60, 50, 60, 80, 90, 100, 80, 60, 50, 40, 30, 20][i];
          return (
            <div key={i} className="group relative h-12 rounded-sm flex items-center justify-center text-xs font-mono text-white" 
                 style={{ backgroundColor: `rgba(239, 68, 68, ${intensity / 100})` }}>
              <span className="opacity-0 group-hover:opacity-100 drop-shadow-md">{i}:00</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}