'use client';

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

interface Inputs {
  currentUsers: number;
  monthlyGrowthRate: number;
  conversionRate: number;
  arpu: number;
}

function calcProjections(inputs: Inputs) {
  const rows = [];
  let users = inputs.currentUsers;

  for (let i = 0; i < 12; i++) {
    users = users * (1 + inputs.monthlyGrowthRate / 100);
    const paidUsers = users * (inputs.conversionRate / 100);
    const mrr = paidUsers * inputs.arpu;
    const arr = mrr * 12;
    const clv = inputs.arpu * (1 / (inputs.monthlyGrowthRate / 100 || 0.01)) * (inputs.conversionRate / 100);
    rows.push({ month: MONTHS[i], users: Math.round(users), paidUsers: Math.round(paidUsers), mrr, arr, clv });
  }

  return rows;
}

const SCENARIOS = {
  conservative: { monthlyGrowthRate: 3,  conversionRate: 2,  arpu: 8  },
  moderate:     { monthlyGrowthRate: 8,  conversionRate: 4,  arpu: 12 },
  aggressive:   { monthlyGrowthRate: 15, conversionRate: 7,  arpu: 18 },
} as const;

type Scenario = keyof typeof SCENARIOS;

export default function ProjectionsPage() {
  const [currentUsers, setCurrentUsers] = useState(5000);
  const [scenario, setScenario] = useState<Scenario>('moderate');
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState<number>(SCENARIOS.moderate.monthlyGrowthRate);
  const [conversionRate, setConversionRate] = useState<number>(SCENARIOS.moderate.conversionRate);
  const [arpu, setArpu] = useState<number>(SCENARIOS.moderate.arpu);

  function applyScenario(s: Scenario) {
    setScenario(s);
    setMonthlyGrowthRate(SCENARIOS[s].monthlyGrowthRate);
    setConversionRate(SCENARIOS[s].conversionRate);
    setArpu(SCENARIOS[s].arpu);
  }

  const projections = useMemo(
    () => calcProjections({ currentUsers, monthlyGrowthRate, conversionRate, arpu }),
    [currentUsers, monthlyGrowthRate, conversionRate, arpu]
  );

  const finalMonth = projections[projections.length - 1];

  const chartData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'MRR ($)',
        data: projections.map((r) => Math.round(r.mrr)),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'ARR ($)',
        data: projections.map((r) => Math.round(r.arr)),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        tension: 0.3,
        fill: false,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Revenue Projections</h1>
        <ExportButton
          onExport={(onProgress) =>
            exportRowsToCsv({
              filenamePrefix: 'revenue-projections',
              rows: projections.map((r) => ({
                month: r.month,
                total_users: r.users,
                paid_users: r.paidUsers,
                mrr_usd: Math.round(r.mrr),
                arr_usd: Math.round(r.arr),
                clv_usd: Math.round(r.clv),
              })),
              filters: { scenario, currentUsers, monthlyGrowthRate, conversionRate, arpu },
              onProgress,
            })
          }
        />
      </div>

      {/* Scenario sliders */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => applyScenario(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                scenario === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'hover:bg-indigo-50 dark:hover:bg-indigo-950'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Current Users', value: currentUsers, min: 100, max: 500000, step: 100, set: setCurrentUsers, fmt: (v: number) => v.toLocaleString() },
            { label: 'Monthly Growth Rate (%)', value: monthlyGrowthRate, min: 0.5, max: 50, step: 0.5, set: setMonthlyGrowthRate, fmt: (v: number) => `${v}%` },
            { label: 'Conversion Rate to Paid (%)', value: conversionRate, min: 0.1, max: 30, step: 0.1, set: setConversionRate, fmt: (v: number) => `${v}%` },
            { label: 'Avg Revenue Per User ($/mo)', value: arpu, min: 1, max: 100, step: 1, set: setArpu, fmt: (v: number) => `$${v}` },
          ].map(({ label, value, min, max, step, set, fmt }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-semibold">{fmt(value)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => { set(Number(e.target.value)); setScenario('moderate'); }}
                className="w-full accent-indigo-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Month-12 MRR',  value: `$${Math.round(finalMonth.mrr).toLocaleString()}` },
          { label: 'Month-12 ARR',  value: `$${Math.round(finalMonth.arr).toLocaleString()}` },
          { label: 'Month-12 Users', value: finalMonth.users.toLocaleString() },
          { label: 'Customer LTV',  value: `$${Math.round(finalMonth.clv).toLocaleString()}` },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">12-Month Revenue Forecast</h2>
        <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>

      {/* Breakdown table */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              {['Month', 'Total Users', 'Paid Users', 'MRR', 'ARR'].map((h) => (
                <th key={h} className="pb-2 pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projections.map((r) => (
              <tr key={r.month} className="border-b last:border-0">
                <td className="py-2 pr-6 font-medium">{r.month}</td>
                <td className="py-2 pr-6">{r.users.toLocaleString()}</td>
                <td className="py-2 pr-6">{r.paidUsers.toLocaleString()}</td>
                <td className="py-2 pr-6">${Math.round(r.mrr).toLocaleString()}</td>
                <td className="py-2 pr-6">${Math.round(r.arr).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
