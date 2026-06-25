export interface TrustFactor {
  label: string;
  score: number;
  maxScore: number;
  weight: number;
}

export interface TrustResult {
  overall: number;
  factors: TrustFactor[];
  regionScores: { region: string; score: number }[];
  anomalyAlerts: { label: string; severity: 'low' | 'medium' | 'high'; detail: string }[];
}

export function calculateTrustScore(): TrustResult {
  const factors: TrustFactor[] = [
    { label: 'On-Chain Verification Rate', score: 94, maxScore: 100, weight: 30 },
    { label: 'Content Authenticity Score', score: 88, maxScore: 100, weight: 25 },
    { label: 'Flag Accuracy',              score: 91, maxScore: 100, weight: 20 },
    { label: 'Wallet Reputation',          score: 82, maxScore: 100, weight: 15 },
    { label: 'Moderation Response Time',   score: 76, maxScore: 100, weight: 10 },
  ];

  const overall = Math.round(
    factors.reduce((sum, f) => sum + (f.score / f.maxScore) * f.weight, 0)
  );

  return {
    overall,
    factors,
    regionScores: [
      { region: 'North America', score: 92 },
      { region: 'Europe',        score: 89 },
      { region: 'Asia Pacific',  score: 85 },
      { region: 'South America', score: 78 },
      { region: 'Africa',        score: 72 },
      { region: 'Middle East',   score: 80 },
    ],
    anomalyAlerts: [
      { label: 'Spike in unverified registrations', severity: 'high',   detail: '+42% vs weekly avg' },
      { label: 'Drop in content authenticity score', severity: 'medium', detail: '-8 points in 24h' },
      { label: 'Wallet age anomaly detected',        severity: 'low',    detail: 'New wallets with high tip volume' },
    ],
  };
}

export const MONTHLY_TRUST_TREND = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  data: [72, 75, 79, 83, 86, 88],
};

export const SPAM_TREND = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  data: [5.8, 5.2, 4.7, 4.1, 3.6, 3.2],
};

export function getTrustScoreColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#eab308';
  return '#ef4444';
}
