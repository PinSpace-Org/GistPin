'use client';

interface TestSuite {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
}

const MOCK_SUITES: TestSuite[] = [
  { name: 'Unit Tests',        total: 142, passed: 138, failed: 3, skipped: 1, duration: '4.2s' },
  { name: 'Integration Tests', total: 58,  passed: 55,  failed: 2, skipped: 1, duration: '12.1s' },
  { name: 'E2E Tests',         total: 24,  passed: 22,  failed: 1, skipped: 1, duration: '48.3s' },
];

function StatusBadge({ value, type }: { value: number; type: 'passed' | 'failed' | 'skipped' }) {
  const cls = {
    passed:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }[type];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}

export default function TestingMetricsDashboard() {
  const totals = MOCK_SUITES.reduce(
    (acc, s) => ({ total: acc.total + s.total, passed: acc.passed + s.passed, failed: acc.failed + s.failed }),
    { total: 0, passed: 0, failed: 0 },
  );
  const passRate = Math.round((totals.passed / totals.total) * 100);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Testing Metrics</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tests', value: totals.total, color: 'text-gray-800 dark:text-gray-100' },
          { label: 'Passed',      value: totals.passed, color: 'text-green-600 dark:text-green-400' },
          { label: 'Failed',      value: totals.failed, color: 'text-red-600 dark:text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Pass rate</span>
          <span className="font-medium text-gray-800 dark:text-gray-100">{passRate}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-2 rounded-full bg-green-500" style={{ width: `${passRate}%` }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              {['Suite', 'Total', 'Passed', 'Failed', 'Skipped', 'Duration'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {MOCK_SUITES.map((s) => (
              <tr key={s.name} className="bg-white dark:bg-gray-900">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.total}</td>
                <td className="px-4 py-3"><StatusBadge value={s.passed}  type="passed"  /></td>
                <td className="px-4 py-3"><StatusBadge value={s.failed}  type="failed"  /></td>
                <td className="px-4 py-3"><StatusBadge value={s.skipped} type="skipped" /></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
