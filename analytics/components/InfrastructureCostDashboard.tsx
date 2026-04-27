'use client';

interface CostItem {
  service: string;
  category: string;
  monthlyCost: number;
  trend: 'up' | 'down' | 'stable';
}

const MOCK_COSTS: CostItem[] = [
  { service: 'Database (PostgreSQL)', category: 'Storage',  monthlyCost: 240,  trend: 'stable' },
  { service: 'App Servers (x4)',       category: 'Compute',  monthlyCost: 560,  trend: 'up'     },
  { service: 'CDN / Bandwidth',        category: 'Network',  monthlyCost: 85,   trend: 'up'     },
  { service: 'Object Storage (S3)',    category: 'Storage',  monthlyCost: 42,   trend: 'stable' },
  { service: 'Logging & Monitoring',  category: 'Observability', monthlyCost: 130, trend: 'down' },
  { service: 'CI/CD Pipeline',         category: 'DevOps',   monthlyCost: 60,   trend: 'stable' },
];

const trendIcon = { up: '↑', down: '↓', stable: '→' } as const;
const trendColor = {
  up:     'text-red-500',
  down:   'text-green-500',
  stable: 'text-gray-400',
} as const;

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export default function InfrastructureCostDashboard() {
  const total = MOCK_COSTS.reduce((s, c) => s + c.monthlyCost, 0);

  const byCategory = MOCK_COSTS.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.monthlyCost;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Infrastructure Cost</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(byCategory).map(([cat, cost]) => (
          <div key={cat} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">{cat}</p>
            <p className="mt-1 text-lg font-bold text-gray-800 dark:text-gray-100">{fmt(cost)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total monthly spend</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              {['Service', 'Category', 'Monthly Cost', 'Trend'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {MOCK_COSTS.map((c) => (
              <tr key={c.service} className="bg-white dark:bg-gray-900">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.service}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.category}</td>
                <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{fmt(c.monthlyCost)}</td>
                <td className={`px-4 py-3 font-semibold ${trendColor[c.trend]}`}>
                  {trendIcon[c.trend]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
