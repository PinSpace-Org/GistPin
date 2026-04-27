export interface UserRisk {
  id: string;
  name: string;
  riskScore: number;
  lastActive: string;
  gists: number;
  engagement: number;
}

export function calcRiskScore(daysSinceActive: number, gists: number, engagement: number): number {
  const activityPenalty = Math.min(daysSinceActive / 30, 1) * 50;
  const gistBonus = Math.min(gists / 20, 1) * 25;
  const engagementBonus = Math.min(engagement / 100, 1) * 25;
  return Math.round(activityPenalty + (25 - gistBonus) + (25 - engagementBonus));
}

export const AT_RISK_USERS: UserRisk[] = [
  { id: 'u1', name: 'Alex M.', riskScore: 82, lastActive: '2026-02-10', gists: 3, engagement: 12 },
  { id: 'u2', name: 'Jordan K.', riskScore: 74, lastActive: '2026-02-18', gists: 5, engagement: 20 },
  { id: 'u3', name: 'Sam T.', riskScore: 68, lastActive: '2026-02-22', gists: 8, engagement: 35 },
  { id: 'u4', name: 'Riley P.', riskScore: 61, lastActive: '2026-02-25', gists: 10, engagement: 42 },
  { id: 'u5', name: 'Casey L.', riskScore: 55, lastActive: '2026-03-01', gists: 12, engagement: 50 },
];

export const CHURN_FACTORS = [
  { factor: 'Inactivity', weight: 38 },
  { factor: 'Low engagement', weight: 27 },
  { factor: 'No gists posted', weight: 18 },
  { factor: 'No social interactions', weight: 11 },
  { factor: 'Other', weight: 6 },
];
