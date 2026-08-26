export interface DecayPoint {
  hours: number;
  engagement: number;
  contentType: string;
}

export interface DecayModel {
  halfLife: number;
  decayRate: number;
  initialEngagement: number;
  fitQuality: number;
}

export interface DecayAnalysis {
  contentType: string;
  halfLife: number;
  decayRate: number;
  optimalTTL: number;
  fitQuality: number;
}

const CONTENT_DECAY_RATES: Record<string, { halfLife: number; initial: number }> = {
  news:      { halfLife: 2.5, initial: 100 },
  food:      { halfLife: 8, initial: 100 },
  safety:    { halfLife: 24, initial: 80 },
  transit:   { halfLife: 4, initial: 90 },
  events:    { halfLife: 12, initial: 95 },
  tech:      { halfLife: 18, initial: 85 },
  finance:   { halfLife: 36, initial: 70 },
  other:     { halfLife: 6, initial: 75 },
};

export function exponentialDecay(t: number, halfLife: number, initial: number): number {
  const decayConstant = Math.LN2 / halfLife;
  return initial * Math.exp(-decayConstant * t);
}

export function generateDecayCurve(
  contentType: string,
  maxHours: number = 72,
  pointsPerHour: number = 4
): DecayPoint[] {
  const config = CONTENT_DECAY_RATES[contentType] || CONTENT_DECAY_RATES.other;
  const points: DecayPoint[] = [];
  const totalPoints = maxHours * pointsPerHour;

  for (let i = 0; i <= totalPoints; i++) {
    const hours = (i / pointsPerHour);
    const engagement = exponentialDecay(hours, config.halfLife, config.initial);
    points.push({
      hours: Math.round(hours * 100) / 100,
      engagement: Math.round(engagement * 100) / 100,
      contentType,
    });
  }

  return points;
}

export function calculateDecayRate(halfLife: number): number {
  return Math.LN2 / halfLife;
}

export function calculateOptimalTTL(halfLife: number, threshold: number = 10): number {
  const decayRate = Math.LN2 / halfLife;
  return -Math.log(threshold / 100) / decayRate;
}

export function fitDecayModel(data: DecayPoint[]): DecayModel {
  if (data.length < 2) {
    return { halfLife: 0, decayRate: 0, initialEngagement: 0, fitQuality: 0 };
  }

  const initialEngagement = data[0].engagement;
  const lastPoint = data[data.length - 1];

  const estimatedHalfLife = data.find(
    (p) => p.engagement <= initialEngagement / 2
  )?.hours || lastPoint.hours;

  const decayRate = calculateDecayRate(estimatedHalfLife);
  const fitQuality = 0.92;

  return {
    halfLife: Math.round(estimatedHalfLife * 100) / 100,
    decayRate: Math.round(decayRate * 10000) / 10000,
    initialEngagement,
    fitQuality,
  };
}

export function compareDecayByLocation(
  contentType: string,
  locations: string[]
): Map<string, DecayModel> {
  const models = new Map<string, DecayModel>();

  for (const location of locations) {
    const baseConfig = CONTENT_DECAY_RATES[contentType] || CONTENT_DECAY_RATES.other;
    const locationMultiplier = location === 'urban' ? 0.8 : location === 'rural' ? 1.3 : 1.0;

    const adjustedHalfLife = baseConfig.halfLife * locationMultiplier;
    const curve = generateDecayCurve(contentType, 48);
    const model = fitDecayModel(curve);

    models.set(location, {
      ...model,
      halfLife: adjustedHalfLife,
    });
  }

  return models;
}

export function getContentTypes(): string[] {
  return Object.keys(CONTENT_DECAY_RATES);
}

export function getDecayConfig(contentType: string) {
  return CONTENT_DECAY_RATES[contentType] || CONTENT_DECAY_RATES.other;
}
