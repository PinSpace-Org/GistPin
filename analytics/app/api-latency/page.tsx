'use client';
import { useState } from 'react';
interface LatencyData { endpoint: string; p50: number; p95: number; p99: number; p999: number; }
export default function ApiLatencyPage() {
  const [data] = useState<LatencyData[]>([
    { endpoint:'/api/gists', p50:45, p95:120, p99:250, p999:500 },
    { endpoint:'/api/gist/:id', p50:30, p95:90, p99:200, p999:400 },
    { endpoint:'/api/health', p50:10, p95:25, p99:50, p999:100 },
  ]);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Latency Percentiles</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Endpoint</th><th className="px-4 py-2 text-right">P50</th><th className="px-4 py-2 text-right">P95</th><th className="px-4 py-2 text-right">P99</th><th className="px-4 py-2 text-right">P99.9</th></tr></thead>
        <tbody>{data.map(d => <tr key={d.endpoint} className="border-t"><td className="px-4 py-2">{d.endpoint}</td><td className="px-4 py-2 text-right">{d.p50}ms</td><td className="px-4 py-2 text-right">{d.p95}ms</td><td className="px-4 py-2 text-right">{d.p99}ms</td><td className="px-4 py-2 text-right">{d.p999}ms</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
