export function LatencyPercentiles({ data }: { data: { endpoint: string; p50: number; p95: number; p99: number }[] }) {
  return <div className="p-4"><h3 className="font-semibold">Latency Percentiles</h3><ul>{data.map(d => <li key={d.endpoint}>{d.endpoint}: P50={d.p50}ms P95={d.p95}ms</li>)}</ul></div>;
}
