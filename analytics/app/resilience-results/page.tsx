'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const PASS = '#15803d';
const FAIL = '#dc2626';
const PARTIAL = '#b45309';
const SERIES = ['#6366f1', '#f59e0b', '#14b8a6'];

type Outcome = 'pass' | 'partial' | 'fail';

interface TestRun {
  id: string;
  date: string;
  experiment: string;
  component: string;
  hypothesis: string;
  outcome: Outcome;
  /** Minutes from fault injection to steady state restored. */
  recoveryMin: number | null;
  blastRadius: string;
  owner: string;
}

/** Chaos experiment catalogue, newest run last within each component. */
const RUNS: TestRun[] = [
  { id: 'CE-081', date: '2026-08-26', experiment: 'Soroban RPC blackhole (60s)', component: 'Soroban Bridge', hypothesis: 'Reads fall back to the cached ledger snapshot', outcome: 'fail',    recoveryMin: 22, blastRadius: 'All contract reads', owner: 'Chain Team' },
  { id: 'CE-080', date: '2026-08-25', experiment: 'Primary DB failover',          component: 'PostGIS',        hypothesis: 'Replica promotes inside 30s with no lost writes', outcome: 'pass',    recoveryMin: 2,  blastRadius: 'Writes, 1 AZ',        owner: 'Data Team' },
  { id: 'CE-079', date: '2026-08-22', experiment: 'IPFS gateway outage',          component: 'IPFS Gateway',   hypothesis: 'Media requests reroute to the secondary gateway', outcome: 'pass',   recoveryMin: 3,  blastRadius: 'Media reads',         owner: 'Platform Team' },
  { id: 'CE-078', date: '2026-08-20', experiment: 'Indexer pod kill (50%)',       component: 'Gist Indexer',   hypothesis: 'Backlog drains within 10 min after rescheduling', outcome: 'partial', recoveryMin: 14, blastRadius: 'Event ingest lag',    owner: 'Platform Team' },
  { id: 'CE-077', date: '2026-08-18', experiment: 'Redis eviction storm',         component: 'Cache Layer',    hypothesis: 'Cold cache does not exceed 2× origin load',        outcome: 'fail',    recoveryMin: 31, blastRadius: 'All read paths',      owner: 'Core Team' },
  { id: 'CE-076', date: '2026-08-15', experiment: 'API gateway CPU stress (90%)', component: 'API Gateway',    hypothesis: 'Autoscaler adds capacity before p99 doubles',      outcome: 'pass',    recoveryMin: 4,  blastRadius: 'All API traffic',     owner: 'Platform Team' },
  { id: 'CE-075', date: '2026-08-12', experiment: 'Soroban RPC latency +800ms',   component: 'Soroban Bridge', hypothesis: 'Circuit breaker opens before the queue saturates', outcome: 'fail',    recoveryMin: 27, blastRadius: 'Tip settlement',      owner: 'Chain Team' },
  { id: 'CE-074', date: '2026-08-09', experiment: 'AZ evacuation (eu-west-1a)',   component: 'API Gateway',    hypothesis: 'Traffic shifts with < 1% error budget spend',      outcome: 'pass',    recoveryMin: 6,  blastRadius: '1 of 3 AZs',          owner: 'Platform Team' },
  { id: 'CE-073', date: '2026-08-06', experiment: 'Cache node partition',         component: 'Cache Layer',    hypothesis: 'Client ring rebalances without stale reads',       outcome: 'partial', recoveryMin: 11, blastRadius: 'Feed reads',          owner: 'Core Team' },
  { id: 'CE-072', date: '2026-08-03', experiment: 'PostGIS connection exhaustion',component: 'PostGIS',        hypothesis: 'Pooler sheds load instead of stalling',            outcome: 'pass',    recoveryMin: 5,  blastRadius: 'Geo queries',         owner: 'Data Team' },
  { id: 'CE-071', date: '2026-07-30', experiment: 'Indexer disk pressure',        component: 'Gist Indexer',   hypothesis: 'Compaction keeps ingest under the SLO',            outcome: 'fail',    recoveryMin: 38, blastRadius: 'Event ingest',        owner: 'Platform Team' },
  { id: 'CE-070', date: '2026-07-27', experiment: 'IPFS pin service throttle',    component: 'IPFS Gateway',   hypothesis: 'Pin retries back off without dropping content',    outcome: 'pass',    recoveryMin: 7,  blastRadius: 'Media writes',        owner: 'Platform Team' },
];

/** Monthly rollup: how the programme has trended over two quarters. */
const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const MONTHLY = {
  run:       [6, 8, 9, 11, 12, 12],
  passed:    [2, 4, 5, 7, 8, 8],
  partial:   [1, 2, 2, 2, 2, 2],
  failed:    [3, 2, 2, 2, 2, 2],
  /** Mean time to recovery across failing runs, minutes. */
  mttrMin:   [62, 54, 47, 38, 33, 28],
  /** Composite resilience score: pass rate, MTTR, and blast-radius containment. */
  resilience: [48, 56, 63, 71, 78, 82],
};

const COMPONENTS = ['Soroban Bridge', 'Cache Layer', 'Gist Indexer', 'PostGIS', 'IPFS Gateway', 'API Gateway'];

const OUTCOME_COLOR: Record<Outcome, string> = { pass: PASS, partial: PARTIAL, fail: FAIL };
const OUTCOME_LABEL: Record<Outcome, string> = { pass: 'Pass', partial: 'Partial', fail: 'Fail' };

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: 24,
  border: '1px solid #e5e7eb',
};
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 };
const td: React.CSSProperties = { padding: '8px 10px' };

export default function ResilienceResultsPage() {
  const [componentFilter, setComponentFilter] = useState<string>('all');

  const stats = useMemo(() => {
    const total = RUNS.length;
    const passed = RUNS.filter((r) => r.outcome === 'pass').length;
    const failed = RUNS.filter((r) => r.outcome !== 'pass');
    const mttr =
      failed.reduce((s, r) => s + (r.recoveryMin ?? 0), 0) / Math.max(1, failed.length);
    return {
      total,
      passRate: Math.round((passed / total) * 100),
      failedCount: failed.length,
      mttr: Math.round(mttr),
    };
  }, []);

  /** Per-component weakness: failure share weighted by how slowly it recovers. */
  const weakness = useMemo(() => {
    return COMPONENTS.map((name) => {
      const runs = RUNS.filter((r) => r.component === name);
      const fails = runs.filter((r) => r.outcome !== 'pass');
      const failRate = (fails.length / runs.length) * 100;
      const avgRecovery = runs.reduce((s, r) => s + (r.recoveryMin ?? 0), 0) / runs.length;
      // Score 0-100, higher = weaker. Fail rate dominates; slow recovery amplifies it.
      const score = Math.round(Math.min(100, failRate * 0.7 + Math.min(60, avgRecovery) * 0.5));
      return { name, runs: runs.length, fails: fails.length, failRate: Math.round(failRate), avgRecovery: Math.round(avgRecovery), score };
    }).sort((a, b) => b.score - a.score);
  }, []);

  const visibleRuns =
    componentFilter === 'all' ? RUNS : RUNS.filter((r) => r.component === componentFilter);

  const passRateData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'Passed',
        data: MONTHLY.passed,
        backgroundColor: PASS,
        borderRadius: 4,
        stack: 'runs',
      },
      {
        label: 'Partial',
        data: MONTHLY.partial,
        backgroundColor: PARTIAL,
        borderRadius: 4,
        stack: 'runs',
      },
      { label: 'Failed', data: MONTHLY.failed, backgroundColor: FAIL, borderRadius: 4, stack: 'runs' },
    ],
  };

  const mttrData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'MTTR from test failures (min)',
        data: MONTHLY.mttrMin,
        borderColor: SERIES[1],
        backgroundColor: 'rgba(245,158,11,0.10)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const resilienceData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'Resilience score',
        data: MONTHLY.resilience,
        borderColor: SERIES[0],
        backgroundColor: 'rgba(99,102,241,0.10)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
      {
        label: 'Target (85)',
        data: MONTHS.map(() => 85),
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const weaknessData = {
    labels: weakness.map((w) => w.name),
    datasets: [
      {
        label: 'Weakness index',
        data: weakness.map((w) => w.score),
        backgroundColor: weakness.map((w) => (w.score >= 45 ? FAIL : w.score >= 25 ? PARTIAL : PASS)),
        borderRadius: 4,
      },
    ],
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, boxHeight: 12, color: '#374151', font: { size: 11 } },
      },
      tooltip: { backgroundColor: 'rgba(17,24,39,0.92)', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } },
      },
    },
  };

  const kpis = [
    { label: 'Experiments run (6 mo)', value: String(MONTHLY.run.reduce((a, b) => a + b, 0)) },
    { label: 'Pass rate (last 12 runs)', value: `${stats.passRate}%` },
    { label: 'MTTR from failures', value: `${stats.mttr} min` },
    { label: 'Resilience score', value: `${MONTHLY.resilience[MONTHLY.resilience.length - 1]}/100` },
  ];

  const weakest = weakness[0];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800 }}>Platform Resilience Results</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Chaos engineering and resilience test outcomes — pass/fail history, recovery time, and where
          the platform is still brittle.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 12,
          marginBottom: 32,
          border: '1px solid #fecaca',
          background: '#fef2f2',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: '20px' }} aria-hidden>
          ⛔
        </span>
        <div style={{ fontSize: 13, color: '#111827' }}>
          <strong>Weakest component: {weakest.name}</strong> — {weakest.fails} of {weakest.runs}{' '}
          experiments failed ({weakest.failRate}%) with an average recovery of {weakest.avgRecovery}{' '}
          minutes. Prioritise its fallback path before the next game day.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Outcomes over time</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Experiments per month by outcome. Pass rate rose from 33% in March to{' '}
            {Math.round((MONTHLY.passed[5] / MONTHLY.run[5]) * 100)}% in August.
          </p>
          <div style={{ height: 260 }}>
            <Bar
              data={passRateData}
              options={{
                ...baseOptions,
                scales: {
                  x: { ...baseOptions.scales.x, stacked: true },
                  y: {
                    ...baseOptions.scales.y,
                    stacked: true,
                    title: { display: true, text: 'Experiments', color: '#6b7280', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>MTTR from test failures</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Mean minutes from fault injection to steady state restored, across failing runs. Lower is
            better.
          </p>
          <div style={{ height: 260 }}>
            <Line
              data={mttrData}
              options={{
                ...baseOptions,
                plugins: { ...baseOptions.plugins, legend: { display: false } },
                scales: {
                  ...baseOptions.scales,
                  y: {
                    ...baseOptions.scales.y,
                    title: { display: true, text: 'Minutes', color: '#6b7280', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Resilience improvement</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Composite of pass rate, recovery speed, and blast-radius containment.
          </p>
          <div style={{ height: 260 }}>
            <Line
              data={resilienceData}
              options={{
                ...baseOptions,
                scales: {
                  ...baseOptions.scales,
                  y: {
                    ...baseOptions.scales.y,
                    max: 100,
                    title: { display: true, text: 'Score / 100', color: '#6b7280', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Weakest components</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Failure rate weighted by average recovery time. Higher is weaker.
          </p>
          <div style={{ height: 260 }}>
            <Bar
              data={weaknessData}
              options={{
                ...baseOptions,
                indexAxis: 'y' as const,
                plugins: { ...baseOptions.plugins, legend: { display: false } },
                scales: {
                  x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    border: { display: false },
                    ticks: { color: '#6b7280', font: { size: 11 } },
                  },
                  y: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Component scorecard</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
              <th style={th}>Component</th>
              <th style={th}>Runs</th>
              <th style={th}>Failures</th>
              <th style={th}>Fail rate</th>
              <th style={th}>Avg recovery</th>
              <th style={th}>Weakness index</th>
            </tr>
          </thead>
          <tbody>
            {weakness.map((w) => (
              <tr key={w.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ ...td, fontWeight: 600 }}>{w.name}</td>
                <td style={td}>{w.runs}</td>
                <td style={td}>{w.fails}</td>
                <td style={td}>{w.failRate}%</td>
                <td style={td}>{w.avgRecovery} min</td>
                <td
                  style={{
                    ...td,
                    fontWeight: 700,
                    color: w.score >= 45 ? FAIL : w.score >= 25 ? PARTIAL : PASS,
                  }}
                >
                  {w.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Test results history</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...COMPONENTS].map((c) => (
              <button
                key={c}
                onClick={() => setComponentFilter(c)}
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  background: componentFilter === c ? '#111827' : '#fff',
                  color: componentFilter === c ? '#fff' : '#374151',
                }}
              >
                {c === 'all' ? 'All components' : c}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                <th style={th}>Run</th>
                <th style={th}>Date</th>
                <th style={th}>Experiment</th>
                <th style={th}>Component</th>
                <th style={th}>Hypothesis</th>
                <th style={th}>Outcome</th>
                <th style={th}>Recovery</th>
                <th style={th}>Blast radius</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ ...td, fontFamily: 'ui-monospace, monospace', color: '#6b7280' }}>{r.id}</td>
                  <td style={td}>{r.date}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.experiment}</td>
                  <td style={td}>{r.component}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{r.hypothesis}</td>
                  <td style={{ ...td, fontWeight: 600, color: OUTCOME_COLOR[r.outcome] }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        marginRight: 8,
                        background: OUTCOME_COLOR[r.outcome],
                      }}
                      aria-hidden
                    />
                    {OUTCOME_LABEL[r.outcome]}
                  </td>
                  <td style={td}>{r.recoveryMin === null ? '—' : `${r.recoveryMin} min`}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{r.blastRadius}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
