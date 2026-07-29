import React from 'react';
export default function DailyActiveCellTracker() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Daily Active Geohash Cells</h2>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[...Array(16)].map((_, i) => (
          <div key={i} className={`h-16 rounded-md flex items-center justify-center font-mono text-xs ${i % 3 === 0 ? 'bg-green-500 text-white' : i % 5 === 0 ? 'bg-green-300' : 'bg-gray-100'}`}>
            {i % 3 === 0 ? 'ACTIVE' : 'IDLE'}
          </div>
        ))}
      </div>
    </div>
  );
}