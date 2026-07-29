'use client';
import { useState } from 'react';
export default function DigestBuilderPage() {
  const [metrics] = useState(['page_views','active_users','new_posts']);
  const [preview, setPreview] = useState('');
  const generatePreview = () => { setPreview(`Weekly Digest - ${new Date().toLocaleDateString()}\n${metrics.join(', ')}`); };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Weekly Digest Builder</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="font-semibold mb-2">Selected Metrics</h2>
        {metrics.map(m => <span key={m} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">{m}</span>)}
        <button onClick={generatePreview} className="block mt-4 bg-blue-500 text-white px-4 py-2 rounded">Generate Preview</button>
      </div>
      {preview && <div className="bg-white rounded-lg shadow p-4"><h2 className="font-semibold mb-2">Preview</h2><pre className="bg-gray-50 p-4 rounded whitespace-pre-wrap">{preview}</pre></div>}
    </div>
  );
}
