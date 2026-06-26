export interface RevenueStream {
  name: string;
  monthly: number;
  growth: number;
  color: string;
  description: string;
}

export interface RevenueMonth {
  month: string;
  streams: { name: string; value: number }[];
}

export function getRevenueStreams(): RevenueStream[] {
  return [
    { name: 'Tip Fees',        monthly: 42000,  growth: 18,  color: '#6366f1', description: '2% fee on XLM tips' },
    { name: 'Premium Subscriptions', monthly: 28000, growth: 12, color: '#06b6d4', description: 'Pro & Team plans' },
    { name: 'Sponsored Content',     monthly: 15000, growth: 24, color: '#10b981', description: 'Promoted gists' },
    { name: 'API Access',            monthly: 9800,  growth: 8,  color: '#f59e0b', description: 'Developer tier' },
    { name: 'Data Insights',         monthly: 5000,  growth: 32, color: '#ef4444', description: 'Analytics exports' },
  ];
}

export function getRevenueHistory(): RevenueMonth[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const streams = getRevenueStreams();
  const baseValues = streams.map((s) => s.monthly);

  return months.map((month, mi) => {
    const factor = 1 + mi * 0.05; // 5% monthly growth for all
    return {
      month,
      streams: streams.map((s, si) => ({
        name: s.name,
        value: Math.round(baseValues[si] * factor * (0.9 + Math.random() * 0.2)),
      })),
    };
  });
}

export function getTotalRevenue(): number {
  return getRevenueStreams().reduce((sum, s) => sum + s.monthly, 0);
}
