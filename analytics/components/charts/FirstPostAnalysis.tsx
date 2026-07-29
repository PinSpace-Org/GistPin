'use client';
export function FirstPostAnalysis() {
  const buckets = [
    { label:'< 1h', count:120 }, { label:'1-6h', count:85 }, { label:'6-24h', count:60 },
    { label:'1-3d', count:40 }, { label:'3-7d', count:25 }, { label:'> 7d', count:15 },
  ];
  const maxCount = Math.max(...buckets.map(b => b.count));
  const median = '6h';
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Time to First Post</h2>
      <p className="text-sm text-gray-500 mb-4">Median: {median}</p>
      <div className="space-y-2">{buckets.map(b => <div key={b.label} className="flex items-center gap-2"><span className="w-12 text-sm text-right">{b.label}</span><div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden"><div className="bg-blue-500 h-full rounded" style={{width:`${(b.count/maxCount)*100}%`}}/></div><span className="text-sm w-10">{b.count}</span></div>)}</div>
    </div>
  );
}
