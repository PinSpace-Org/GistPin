'use client';

import { useState, useMemo } from 'react';
import {
  DevCostInputs,
  UserValueEstimate,
  calculateDevCost,
  estimateUserValue,
  projectRevenue,
  calculateBreakEven,
  compareScenarios,
} from '../../lib/roi-calc';

const DEFAULT_COSTS: DevCostInputs = {
  designCost: 15000,
  frontendCost: 40000,
  backendCost: 35000,
  smartContractCost: 25000,
  qaCost: 10000,
  monthlyOpsCost: 5000,
};

const DEFAULT_USERS: UserValueEstimate = {
  totalUsers: 10000,
  freeUsers: 8500,
  paidUsers: 1500,
  pricePerUserPerMonth: 10,
};

export default function ROICalculatorPage() {
  const [costs, setCosts] = useState<DevCostInputs>(DEFAULT_COSTS);
  const [users, setUsers] = useState<UserValueEstimate>(DEFAULT_USERS);
  const [platformFeeRate, setPlatformFeeRate] = useState(0.025);
  const [txVolume, setTxVolume] = useState(500000);

  const devCost = useMemo(() => calculateDevCost(costs), [costs]);
  const userValue = useMemo(() => estimateUserValue(users), [users]);
  const revenue = useMemo(() => projectRevenue(userValue, costs.monthlyOpsCost, platformFeeRate, txVolume), [userValue, costs, platformFeeRate, txVolume]);
  const breakEven = useMemo(() => calculateBreakEven(costs, userValue.monthlyRevenue), [costs, userValue]);
  const scenarios = useMemo(() => compareScenarios(costs, users, revenue), [costs, users, revenue]);

  function updateCost(field: keyof DevCostInputs, value: string) {
    setCosts((prev) => ({ ...prev, [field]: Number(value) }));
  }

  function updateUser(field: keyof UserValueEstimate, value: string) {
    setUsers((prev) => ({ ...prev, [field]: Number(value) }));
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ background: 'linear-gradient(135deg,#fff 0%,#dbeafe 100%)', borderRadius: 28, padding: '30px', boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>ROI Calculator</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36 }}>Platform ROI Calculator</h1>
        <p style={{ margin: 0, color: '#475569' }}>Estimate development costs, project revenue, and compare ROI scenarios for platform development.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Development Costs</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { key: 'designCost' as const, label: 'Design ($)' },
              { key: 'frontendCost' as const, label: 'Frontend ($)' },
              { key: 'backendCost' as const, label: 'Backend ($)' },
              { key: 'smartContractCost' as const, label: 'Smart Contracts ($)' },
              { key: 'qaCost' as const, label: 'QA / Testing ($)' },
              { key: 'monthlyOpsCost' as const, label: 'Monthly Ops ($)' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 14, color: '#475569' }}>{label}</label>
                <input type="number" value={costs[key]} min={0} onChange={(e) => updateCost(key, e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#eff6ff', borderRadius: 12 }}>
            <strong>Total Dev Cost: ${devCost.toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>User & Revenue</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { key: 'totalUsers' as const, label: 'Total Users' },
              { key: 'freeUsers' as const, label: 'Free Users' },
              { key: 'paidUsers' as const, label: 'Paid Users' },
              { key: 'pricePerUserPerMonth' as const, label: 'Price/User/Mo ($)' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 14, color: '#475569' }}>{label}</label>
                <input type="number" value={users[key]} min={0} onChange={(e) => updateUser(key, e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 14, color: '#475569' }}>Platform Fee Rate</label>
              <input type="number" value={platformFeeRate} min={0} max={1} step={0.001} onChange={(e) => setPlatformFeeRate(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 14, color: '#475569' }}>Annual Tx Volume ($)</label>
              <input type="number" value={txVolume} min={0} onChange={(e) => setTxVolume(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 14 }}>
              MRR: <strong>${revenue.monthlyRecurringRevenue.toLocaleString()}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 14 }}>
              ARR: <strong>${revenue.annualRecurringRevenue.toLocaleString()}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 14 }}>
              Platform Fees: <strong>${revenue.platformFees.toLocaleString()}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
              Total Annual Revenue: <strong>${revenue.totalAnnualRevenue.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Break-even Analysis</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Total Development Cost</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${breakEven.totalDevelopmentCost.toLocaleString()}</div>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Monthly Net Revenue</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${breakEven.monthlyNetRevenue.toLocaleString()}</div>
            </div>
            <div style={{ padding: '12px 16px', background: breakEven.breakEvenMonths === Infinity ? '#fef2f2' : '#f0fdf4', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Break-even</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {breakEven.breakEvenMonths === Infinity ? 'N/A (not profitable)' : `${breakEven.breakEvenMonths} months (${breakEven.breakEvenDate})`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Scenario Comparison</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr>
                  {['Scenario', 'Net Profit', 'ROI', 'Break-even'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px', fontSize: 13, color: '#64748b', borderBottom: '2px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.label} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{s.label}</td>
                    <td style={{ padding: '12px 10px', color: s.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                      ${s.netProfit.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ background: s.roiPercent >= 0 ? '#dcfce7' : '#fef2f2', color: s.roiPercent >= 0 ? '#16a34a' : '#dc2626', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>
                        {s.roiPercent}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{s.breakEvenMonths === Infinity ? 'N/A' : `${s.breakEvenMonths} mo`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
