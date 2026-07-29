'use client';
export function WalletAgeActivity() {
  const data = [
    { age:'< 1 month', posts:45, reactions:120 }, { age:'1-3 months', posts:80, reactions:200 },
    { age:'3-6 months', posts:65, reactions:180 }, { age:'6-12 months', posts:90, reactions:250 },
    { age:'> 1 year', posts:120, reactions:320 },
  ];
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Wallet Age vs Activity</h2>
      <table className="w-full"><thead><tr><th className="text-left">Wallet Age</th><th className="text-right">Posts</th><th className="text-right">Reactions</th></tr></thead>
      <tbody>{data.map(d => <tr key={d.age} className="border-t"><td className="py-2">{d.age}</td><td className="text-right">{d.posts}</td><td className="text-right">{d.reactions}</td></tr>)}</tbody></table>
    </div>
  );
}
