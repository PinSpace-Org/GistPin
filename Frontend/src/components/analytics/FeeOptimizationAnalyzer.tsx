import React from 'react';
export default function FeeOptimizationAnalyzer() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">XLM Fee Optimization Analyzer</h2>
      <div className="h-64 bg-blue-50 rounded-md flex items-center justify-center border border-blue-100">
        <div className="space-y-4 w-full px-8">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Low Congestion (100 stroops)</span>
            <span>High Congestion (1000 stroops)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-blue-500 h-4 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <p className="text-center text-sm font-medium text-gray-700 mt-2">Optimal Post Time: 03:00 UTC</p>
        </div>
      </div>
    </div>
  );
}