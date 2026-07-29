export function DigestPreview({ metrics }: { metrics: string[] }) {
  return <div className="p-4 bg-white rounded shadow"><h3 className="font-bold">Digest Preview</h3><ul>{metrics.map(m => <li key={m}>{m}</li>)}</ul></div>;
}
