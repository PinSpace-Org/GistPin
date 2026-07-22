export interface UserActivity {
  users: number[];
  activity: number[];
  timestamps: string[];
}

export interface GeographicData {
  locations: Array<{
    region: string;
    userCount: number;
    activityLevel: number;
  }>;
}

export interface NetworkMetrics {
  valuePerUser: number[];
  metcalfeValues: number[];
  criticalMassIndex: number | null;
  geographicDensity: Record<string, number>;
  networkStrength: number;
}

export function calculateValuePerUser(users: number[], activity: number[]): number[] {
  if (users.length !== activity.length) {
    throw new Error('Users and activity arrays must have the same length');
  }
  
  return users.map((userCount, index) => {
    if (userCount === 0) return 0;
    return activity[index] / userCount;
  });
}

export function metcalfeLawCurve(users: number[]): number[] {
  return users.map(userCount => {
    return (userCount * (userCount - 1)) / 2;
  });
}

export function detectCriticalMass(data: number[]): number | null {
  if (data.length < 3) return null;
  
  let maxGrowthRate = 0;
  let criticalIndex = null;
  
  for (let i = 1; i < data.length - 1; i++) {
    const growthRate = (data[i] - data[i - 1]) / data[i - 1];
    const secondDerivative = (data[i + 1] - 2 * data[i] + data[i - 1]);
    
    if (growthRate > maxGrowthRate && secondDerivative < 0) {
      maxGrowthRate = growthRate;
      criticalIndex = i;
    }
  }
  
  return criticalIndex;
}

export function calculateGeographicDensity(data: GeographicData): Record<string, number> {
  const density: Record<string, number> = {};
  const totalUsers = data.locations.reduce((sum, loc) => sum + loc.userCount, 0);
  
  data.locations.forEach(loc => {
    if (totalUsers > 0) {
      density[loc.region] = (loc.userCount / totalUsers) * 100;
    }
  });
  
  return density;
}

export function calculateNetworkStrength(metrics: {
  valuePerUser: number[];
  metcalfeValues: number[];
  criticalMassIndex: number | null;
  geographicDensity: Record<string, number>;
}): number {
  const latestValuePerUser = metrics.valuePerUser[metrics.valuePerUser.length - 1] || 0;
  const latestMetcalfe = metrics.metcalfeValues[metrics.metcalfeValues.length - 1] || 1;
  
  const valueRatio = Math.min(latestValuePerUser / (latestMetcalfe / 1000), 1);
  const criticalMassBonus = metrics.criticalMassIndex !== null ? 0.2 : 0;
  
  const densityValues = Object.values(metrics.geographicDensity);
  const geographicScore = densityValues.length > 0 
    ? densityValues.reduce((sum, val) => sum + val, 0) / densityValues.length / 100
    : 0;
  
  return Math.min((valueRatio + criticalMassBonus + geographicScore) / 2.2, 1);
}
