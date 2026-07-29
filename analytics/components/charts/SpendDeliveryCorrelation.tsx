'use client';
export function SpendDeliveryCorrelation() {
  const data = [
    { month:'Jan', spend:12000, features:4 }, { month:'Feb', spend:13500, features:5 },
    { month:'Mar', spend:11000, features:3 }, { month:'Apr', spend:14000, features:6 },
  ];
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Infrastructure Spend vs Features</h2>
      <table className="w-full"><thead><tr><th className="text-left">Month</th><th className="text-right">Spend</th><th className="text-right">Features</th><th className="text-right">Cost/Feature</th></tr></thead>
      <tbody>{data.map(d => <tr key={d.month} className="border-t"><td className="py-2">{d.month}</td><td className="text-right">${d.spend.toLocaleString()}</td><td className="text-right">{d.features}</td><td className="text-right">${(d.spend/d.features).toLocaleString()}</td></tr>)}</tbody></table>
    </div>
  );
}
