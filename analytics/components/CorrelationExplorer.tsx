'use client';
import { useState } from 'react';
import { computeCorrelation } from '../lib/correlation';
const METRICS = ['posts_per_user','reactions_per_post','session_duration','daily_active_users'];
export function CorrelationExplorer() {
  const [metricA, setMetricA] = useState(METRICS[0]);
  const [metricB, setMetricB] = useState(METRICS[1]);
  const coef = computeCorrelation(metricA, metricB);
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Correlation Explorer</h2>
      <div className="flex gap-4 mb-4">
        <select value={metricA} onChange={e => setMetricA(e.target.value)} className="border rounded p-2">{METRICS.map(m => <option key={m} value={m}>{m}</option>)}</select>
        <select value={metricB} onChange={e => setMetricB(e.target.value)} className="border rounded p-2">{METRICS.map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-lg">r = <strong>{coef.toFixed(3)}</strong></p><p className="text-sm text-gray-500">{Math.abs(coef) > 0.7 ? 'Strong' : Math.abs(coef) > 0.4 ? 'Moderate' : 'Weak'} correlation</p></div>
    </div>
  );
}
