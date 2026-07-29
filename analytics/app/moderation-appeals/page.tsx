'use client';
import { useState } from 'react';
interface ModerationAction {
  id: string; contentId: string; action: string; category: string;
  timestamp: string; overturned: boolean; appealTime: string;
}
const MOCK_DATA: ModerationAction[] = [
  { id:'1', contentId:'gist-123', action:'removed', category:'spam', timestamp:'2026-07-28T10:00:00Z', overturned:false, appealTime:'2026-07-28T12:00:00Z' },
  { id:'2', contentId:'gist-456', action:'flagged', category:'toxic', timestamp:'2026-07-28T09:00:00Z', overturned:true, appealTime:'2026-07-28T14:00:00Z' },
];
export default function ModerationAppealsPage() {
  const [actions] = useState(MOCK_DATA);
  const total = actions.length;
  const overturned = actions.filter(a => a.overturned).length;
  const overturnRate = total ? (overturned / total * 100).toFixed(1) : '0';
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Moderation Appeals</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">Total Decisions</p><p className="text-3xl font-bold">{total}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">Overturned</p><p className="text-3xl font-bold">{overturned}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">Overturn Rate</p><p className="text-3xl font-bold">{overturnRate}%</p></div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Content ID</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Decision Time</th><th className="px-4 py-2 text-left">Appeal Time</th><th className="px-4 py-2 text-left">Overturned</th></tr></thead>
          <tbody>{actions.map(a => <tr key={a.id} className="border-t"><td className="px-4 py-2">{a.contentId}</td><td className="px-4 py-2">{a.action}</td><td className="px-4 py-2">{a.category}</td><td className="px-4 py-2">{new Date(a.timestamp).toLocaleDateString()}</td><td className="px-4 py-2">{new Date(a.appealTime).toLocaleDateString()}</td><td className="px-4 py-2">{a.overturned ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
