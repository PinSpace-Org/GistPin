export interface ToxicityDataPoint {
  date: string;
  score: number;
  flagged: number;
  moderated: number;
}

export interface LocationToxicity {
  city: string;
  country: string;
  region: string;
  avgScore: number;
  flaggedCount: number;
  moderationRate: number;
  lat: number;
  lng: number;
}

export interface TimeOfDayToxicity {
  hour: number;
  avgScore: number;
  flaggedCount: number;
  moderatedCount: number;
}

export interface HighToxicityEvent {
  id: string;
  date: string;
  location: string;
  score: number;
  type: string;
  status: string;
  gistsAffected: number;
}

export const TOXICITY_TREND: ToxicityDataPoint[] = [
  { date: 'Jan', score: 0.23, flagged: 180, moderated: 165 },
  { date: 'Feb', score: 0.21, flagged: 165, moderated: 155 },
  { date: 'Mar', score: 0.26, flagged: 210, moderated: 195 },
  { date: 'Apr', score: 0.19, flagged: 145, moderated: 140 },
  { date: 'May', score: 0.18, flagged: 130, moderated: 125 },
  { date: 'Jun', score: 0.22, flagged: 170, moderated: 158 },
  { date: 'Jul', score: 0.17, flagged: 120, moderated: 115 },
  { date: 'Aug', score: 0.20, flagged: 150, moderated: 142 },
  { date: 'Sep', score: 0.16, flagged: 110, moderated: 105 },
  { date: 'Oct', score: 0.15, flagged: 95, moderated: 90 },
  { date: 'Nov', score: 0.18, flagged: 135, moderated: 128 },
  { date: 'Dec', score: 0.14, flagged: 85, moderated: 80 },
];

export const LOCATION_TOXICITY: LocationToxicity[] = [
  { city: 'San Francisco', country: 'US', region: 'North America', avgScore: 0.12, flaggedCount: 45, moderationRate: 95, lat: 37.77, lng: -122.42 },
  { city: 'London', country: 'UK', region: 'Europe', avgScore: 0.15, flaggedCount: 62, moderationRate: 92, lat: 51.51, lng: -0.13 },
  { city: 'Tokyo', country: 'JP', region: 'Asia', avgScore: 0.08, flaggedCount: 18, moderationRate: 98, lat: 35.68, lng: 139.69 },
  { city: 'Berlin', country: 'DE', region: 'Europe', avgScore: 0.14, flaggedCount: 38, moderationRate: 94, lat: 52.52, lng: 13.41 },
  { city: 'Nairobi', country: 'KE', region: 'Africa', avgScore: 0.19, flaggedCount: 55, moderationRate: 88, lat: -1.29, lng: 36.82 },
  { city: 'São Paulo', country: 'BR', region: 'South America', avgScore: 0.22, flaggedCount: 72, moderationRate: 85, lat: -23.55, lng: -46.63 },
  { city: 'Mumbai', country: 'IN', region: 'Asia', avgScore: 0.16, flaggedCount: 48, moderationRate: 90, lat: 19.08, lng: 72.88 },
  { city: 'Seoul', country: 'KR', region: 'Asia', avgScore: 0.11, flaggedCount: 28, moderationRate: 96, lat: 37.57, lng: 126.98 },
  { city: 'Lagos', country: 'NG', region: 'Africa', avgScore: 0.25, flaggedCount: 82, moderationRate: 82, lat: 6.52, lng: 3.38 },
  { city: 'Mexico City', country: 'MX', region: 'North America', avgScore: 0.20, flaggedCount: 58, moderationRate: 87, lat: 19.43, lng: -99.13 },
];

export const TIME_OF_DAY_TOXICITY: TimeOfDayToxicity[] = Array.from({ length: 24 }, (_, hour) => {
  const baseScore = hour >= 22 || hour <= 4 ? 0.28 : hour >= 10 && hour <= 16 ? 0.12 : 0.18;
  return {
    hour,
    avgScore: Math.round((baseScore + (Math.random() * 0.08 - 0.04)) * 100) / 100,
    flaggedCount: Math.round(baseScore * 400 + Math.random() * 20),
    moderatedCount: Math.round(baseScore * 380 + Math.random() * 15),
  };
});

export const HIGH_TOXICITY_EVENTS: HighToxicityEvent[] = [
  { id: 'evt-1', date: '2025-12-15', location: 'Lagos', score: 0.82, type: 'Spam Campaign', status: 'Resolved', gistsAffected: 230 },
  { id: 'evt-2', date: '2025-12-08', location: 'São Paulo', score: 0.74, type: 'Hate Speech Wave', status: 'Resolved', gistsAffected: 185 },
  { id: 'evt-3', date: '2025-11-28', location: 'Nairobi', score: 0.69, type: 'Scam Network', status: 'Monitoring', gistsAffected: 142 },
  { id: 'evt-4', date: '2025-11-15', location: 'Mumbai', score: 0.65, type: 'Misinformation', status: 'Resolved', gistsAffected: 110 },
  { id: 'evt-5', date: '2025-11-02', location: 'Mexico City', score: 0.61, type: 'Harassment Ring', status: 'Resolved', gistsAffected: 95 },
];

export function getOverallToxicityScore(): number {
  const latest = TOXICITY_TREND[TOXICITY_TREND.length - 1];
  return latest.score;
}

export function getToxicityChange(): number {
  const latest = TOXICITY_TREND[TOXICITY_TREND.length - 1].score;
  const prev = TOXICITY_TREND[TOXICITY_TREND.length - 2].score;
  return Math.round(((latest - prev) / prev) * 100 * 10) / 10;
}

export function getModerationEffectiveness(): number {
  const totalFlagged = TOXICITY_TREND.reduce((a, d) => a + d.flagged, 0);
  const totalModerated = TOXICITY_TREND.reduce((a, d) => a + d.moderated, 0);
  return Math.round((totalModerated / totalFlagged) * 100);
}
