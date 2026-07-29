import React from 'react';
export default function NeighborhoodDiscovery() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Trending Neighborhoods</h2>
      <ul className="space-y-4">
        <li className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md border border-gray-100">
          <div>
            <p className="font-semibold text-gray-800">Downtown Tech Hub</p>
            <p className="text-xs text-gray-500">geohash: 9q8yy</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">+120% new gists</span>
        </li>
        <li className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md border border-gray-100">
          <div>
            <p className="font-semibold text-gray-800">University Campus</p>
            <p className="text-xs text-gray-500">geohash: 9q8z1</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">+85% new gists</span>
        </li>
      </ul>
    </div>
  );
}