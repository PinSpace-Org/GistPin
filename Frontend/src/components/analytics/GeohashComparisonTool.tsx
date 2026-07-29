import React from 'react';
export default function GeohashComparisonTool() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Geohash Precision Comparison</h2>
      <div className="flex gap-4">
        <div className="flex-1 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <h3 className="font-bold text-orange-800 mb-2">Low Precision (L5)</h3>
          <p className="font-mono text-sm bg-white p-2 rounded border border-orange-100">9q8yy</p>
          <p className="text-xs text-orange-600 mt-2">Resolution: ~4.9km × 4.9km</p>
          <p className="text-xs text-orange-600">Use Case: City level grouping</p>
        </div>
        <div className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-bold text-blue-800 mb-2">High Precision (L8)</h3>
          <p className="font-mono text-sm bg-white p-2 rounded border border-blue-100">9q8yy12x</p>
          <p className="text-xs text-blue-600 mt-2">Resolution: ~38m × 19m</p>
          <p className="text-xs text-blue-600">Use Case: Exact street corner</p>
        </div>
      </div>
    </div>
  );
}