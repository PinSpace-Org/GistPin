import React from 'react';
export default function SorobanLedgerChart() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Soroban Ledger Activity</h2>
      <div className="h-48 w-full bg-gray-50 rounded flex items-end justify-between px-4 pt-4 border-b-2 border-gray-300">
        {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
          <div key={i} className="w-1/12 bg-indigo-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
    </div>
  );
}