import React from 'react';
export default function ReEngagementFunnel() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">User Re-Engagement Funnel</h2>
      <div className="space-y-3 flex flex-col items-center mt-6">
        <div className="w-full bg-indigo-500 text-white p-3 text-center rounded-t-lg font-semibold">Gist Views (10,000)</div>
        <div className="w-4/5 bg-indigo-400 text-white p-3 text-center font-semibold">Gist Interactions (4,200)</div>
        <div className="w-3/5 bg-indigo-300 text-white p-3 text-center font-semibold">Comments (1,150)</div>
        <div className="w-2/5 bg-indigo-200 text-indigo-900 p-3 text-center rounded-b-lg font-semibold">Return Visits (890)</div>
      </div>
    </div>
  );
}