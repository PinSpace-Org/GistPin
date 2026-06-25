export interface WalletScore {
  wallet: string;
  engagementScore: number;
  tipActivity: number;
  contentQuality: number;
  consistency: number;
  totalGists: number;
  avgTip: number;
  topCategory: string;
}

function randomScore(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export function getWalletScores(): WalletScore[] {
  return [
    { wallet: 'GC...A1B', engagementScore: 92, tipActivity: 88, contentQuality: 95, consistency: 90, totalGists: 145, avgTip: 24, topCategory: 'Tech' },
    { wallet: 'GB...X2K', engagementScore: 85, tipActivity: 78, contentQuality: 82, consistency: 88, totalGists: 98,  avgTip: 18, topCategory: 'Finance' },
    { wallet: 'GA...R9L', engagementScore: 78, tipActivity: 65, contentQuality: 80, consistency: 75, totalGists: 72,  avgTip: 12, topCategory: 'Food' },
    { wallet: 'GC...M2P', engagementScore: 71, tipActivity: 55, contentQuality: 68, consistency: 80, totalGists: 54,  avgTip: 8,  topCategory: 'Safety' },
    { wallet: 'GD...N4Q', engagementScore: 64, tipActivity: 42, contentQuality: 72, consistency: 60, totalGists: 38,  avgTip: 5,  topCategory: 'Events' },
    { wallet: 'GH...B7R', engagementScore: 58, tipActivity: 35, contentQuality: 55, consistency: 65, totalGists: 28,  avgTip: 3,  topCategory: 'News' },
    { wallet: 'GJ...C8S', engagementScore: 45, tipActivity: 28, contentQuality: 50, consistency: 40, totalGists: 18,  avgTip: 2,  topCategory: 'Transit' },
    { wallet: 'GK...D9T', engagementScore: 35, tipActivity: 18, contentQuality: 40, consistency: 30, totalGists: 10,  avgTip: 1,  topCategory: 'Other' },
  ];
}

export function getScoreDistribution(): { range: string; count: number }[] {
  return [
    { range: '90-100', count: 42 },
    { range: '80-89',  count: 85 },
    { range: '70-79',  count: 120 },
    { range: '60-69',  count: 98 },
    { range: '50-59',  count: 65 },
    { range: '0-49',   count: 52 },
  ];
}

export function getTierBreakdown(): { tier: string; count: number; minScore: number }[] {
  return [
    { tier: 'Platinum', count: 42,  minScore: 90 },
    { tier: 'Gold',     count: 85,  minScore: 80 },
    { tier: 'Silver',   count: 120, minScore: 70 },
    { tier: 'Bronze',   count: 98,  minScore: 60 },
    { tier: 'Basic',    count: 117, minScore: 0 },
  ];
}

export function getEngagementScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}
