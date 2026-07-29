import React from 'react';
export default function GistPopularityLeaderboard() {
  const gists = [
    { id: '1', title: 'Hidden Coffee Shop', author: 'brewmaster', upvotes: 342, location: '9q8yy' },
    { id: '2', title: 'Street Art Mural', author: 'banksy_fan', upvotes: 289, location: '9q8z1' },
    { id: '3', title: 'Pop-up Tech Meetup', author: 'devlife', upvotes: 215, location: '9q8yv' }
  ];
  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Global Gist Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 font-semibold">Rank</th>
              <th className="px-4 py-2 font-semibold">Title</th>
              <th className="px-4 py-2 font-semibold">Geohash</th>
              <th className="px-4 py-2 font-semibold text-right">Upvotes</th>
            </tr>
          </thead>
          <tbody>
            {gists.map((g, idx) => (
              <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-indigo-600">#{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{g.title} <span className="text-xs font-normal text-gray-400 block">by {g.author}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{g.location}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">+{g.upvotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}