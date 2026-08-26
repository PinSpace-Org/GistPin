export interface BalanceTier {
  label: string;
  minBalance: number;
  maxBalance: number;
  userCount: number;
  avgPostFrequency: number;
  avgReactions: number;
  avgSessionDuration: number;
  churnRate: number;
}

export interface BalanceTrend {
  month: string;
  tier: string;
  avgBalance: number;
  postsPerUser: number;
  reactionRate: number;
}

export interface LowBalanceBehavior {
  metric: string;
  lowBalance: number;
  midBalance: number;
  highBalance: number;
}

const BALANCE_TIERS: BalanceTier[] = [
  { label: 'Dust (<1 XLM)', minBalance: 0, maxBalance: 1, userCount: 4280, avgPostFrequency: 0.8, avgReactions: 1.2, avgSessionDuration: 2.1, churnRate: 42.3 },
  { label: 'Micro (1-10 XLM)', minBalance: 1, maxBalance: 10, userCount: 3150, avgPostFrequency: 2.4, avgReactions: 4.7, avgSessionDuration: 5.8, churnRate: 28.1 },
  { label: 'Light (10-50 XLM)', minBalance: 10, maxBalance: 50, userCount: 2120, avgPostFrequency: 4.1, avgReactions: 8.3, avgSessionDuration: 9.4, churnRate: 16.5 },
  { label: 'Standard (50-200 XLM)', minBalance: 50, maxBalance: 200, userCount: 1480, avgPostFrequency: 5.7, avgReactions: 12.6, avgSessionDuration: 12.7, churnRate: 10.2 },
  { label: 'Power (200-1000 XLM)', minBalance: 200, maxBalance: 1000, userCount: 680, avgPostFrequency: 7.3, avgReactions: 18.9, avgSessionDuration: 16.3, churnRate: 6.8 },
  { label: 'Whale (1000+ XLM)', minBalance: 1000, maxBalance: Infinity, userCount: 195, avgPostFrequency: 8.9, avgReactions: 32.4, avgSessionDuration: 21.5, churnRate: 3.1 },
];

const BALANCE_TRENDS: BalanceTrend[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date('2026-05-01');
  d.setMonth(d.getMonth() - (11 - i));
  const month = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return {
    month,
    tier: '',
    avgBalance: 0,
    postsPerUser: 0,
    reactionRate: 0,
  };
}).flatMap((base) =>
  ['Dust', 'Micro', 'Light', 'Standard', 'Power', 'Whale'].map((tier) => ({
    ...base,
    tier,
    avgBalance: Math.round(10 + Math.random() * 500),
    postsPerUser: +(1 + Math.random() * 8).toFixed(1),
    reactionRate: +(2 + Math.random() * 15).toFixed(1),
  }))
);

const LOW_BALANCE_BEHAVIOR: LowBalanceBehavior[] = [
  { metric: 'Posts per Week', lowBalance: 0.8, midBalance: 4.1, highBalance: 7.3 },
  { metric: 'Reactions Received', lowBalance: 1.2, midBalance: 8.3, highBalance: 18.9 },
  { metric: 'Session Duration (min)', lowBalance: 2.1, midBalance: 9.4, highBalance: 16.3 },
  { metric: 'Comments per Post', lowBalance: 0.3, midBalance: 1.8, highBalance: 3.4 },
  { metric: 'Tip Frequency / Month', lowBalance: 0.1, midBalance: 1.2, highBalance: 4.7 },
  { metric: 'Content Score', lowBalance: 5.2, midBalance: 7.1, highBalance: 8.8 },
];

export function getBalanceTiers(): BalanceTier[] {
  return BALANCE_TIERS;
}

export function getBalanceTrends(): BalanceTrend[] {
  return BALANCE_TRENDS;
}

export function getLowBalanceBehavior(): LowBalanceBehavior[] {
  return LOW_BALANCE_BEHAVIOR;
}

export function computeCorrelation(): number {
  return 0.847;
}

export function getTierSummary(): { totalUsers: number; avgPostsAcrossTiers: number; strongestTier: string } {
  const totalUsers = BALANCE_TIERS.reduce((s, t) => s + t.userCount, 0);
  const avgPostsAcrossTiers = +(BALANCE_TIERS.reduce((s, t) => s + t.avgPostFrequency, 0) / BALANCE_TIERS.length).toFixed(1);
  const strongestTier = BALANCE_TIERS.reduce((best, t) => (t.avgPostFrequency > best.avgPostFrequency ? t : best)).label;
  return { totalUsers, avgPostsAcrossTiers, strongestTier };
}
