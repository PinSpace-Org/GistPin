'use client';
import { useState } from 'react';
interface SLARecord { month: string; uptime: number; target: number; incidents: number; }
export default function SLATrackerPage() {
  const [records] = useState<SLARecord[]>([
    { month:'2026-07', uptime:99.95, target:99.9, incidents:1 },
    { month:'2026-06', uptime:99.99, target:99.9, incidents:0 },
    { month:'2026-05', uptime:99.88, target:99.9, incidents:2 },
  ]);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">SLA Tracker</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Month</th><th className="px-4 py-2 text-left">Uptime</th><th className="px-4 py-2 text-left">Target</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Incidents</th></tr></thead>
          <tbody>{records.map(r => <tr key={r.month} className="border-t"><td className="px-4 py-2">{r.month}</td><td className="px-4 py-2">{r.uptime}%</td><td className="px-4 py-2">{r.target}%</td><td className="px-4 py-2"><span className={r.uptime >= r.target ? 'text-green-600' : 'text-red-600'}>{r.uptime >= r.target ? 'Met' : 'Missed'}</span></td><td className="px-4 py-2">{r.incidents}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
