'use client';
export function GistLifecycle() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Content Lifecycle Timeline</h2>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        {['Posted', 'First Reaction', 'Peak Views', 'Expiry'].map((stage, i) => (
          <div key={stage} className="flex items-center mb-6 relative">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm z-10">{i+1}</div>
            <div className="ml-4"><p className="font-medium">{stage}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
