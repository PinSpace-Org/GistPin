export interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  score: number;
}

export interface SentimentSummary {
  overallScore: number;
  totalAnalyzed: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  trend: 'improving' | 'declining' | 'stable';
  alerts: string[];
}

export interface LocationSentiment {
  location: string;
  score: number;
  count: number;
}

export interface CategorySentiment {
  category: string;
  score: number;
  sampleSize: number;
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return dates;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getSentimentTrend(days: number = 90): SentimentDataPoint[] {
  const dates = generateDateRange(days);
  return dates.map((date, i) => {
    const base = 0.65 + seededRandom(i * 7) * 0.25;
    const noise = (seededRandom(i * 13) - 0.5) * 0.12;
    const weekendDip = new Date().getDay() === 0 || new Date().getDay() === 6 ? -0.05 : 0;
    const score = Math.max(0, Math.min(1, base + noise + weekendDip));
    const total = Math.round(80 + seededRandom(i * 3) * 120);
    const positive = Math.round(total * (0.45 + score * 0.15));
    const negative = Math.round(total * (0.1 + (1 - score) * 0.15));
    const neutral = total - positive - negative;
    return { date, positive, neutral, negative, total, score: Math.round(score * 100) };
  });
}

export function getSentimentSummary(data: SentimentDataPoint[]): SentimentSummary {
  const recent = data.slice(-7);
  const previous = data.slice(-14, -7);

  const avgRecent = recent.reduce((s, d) => s + d.score, 0) / recent.length;
  const avgPrevious = previous.reduce((s, d) => s + d.score, 0) / previous.length;

  const totalAnalyzed = data.reduce((s, d) => s + d.total, 0);
  const totalPositive = data.reduce((s, d) => s + d.positive, 0);
  const totalNeutral = data.reduce((s, d) => s + d.neutral, 0);
  const totalNegative = data.reduce((s, d) => s + d.negative, 0);

  let trend: 'improving' | 'declining' | 'stable';
  const diff = avgRecent - avgPrevious;
  if (diff > 3) trend = 'improving';
  else if (diff < -3) trend = 'declining';
  else trend = 'stable';

  const alerts: string[] = [];
  if (avgRecent < 40) alerts.push('Critical: Sentiment score below 40 — investigate recent changes');
  if (trend === 'declining') alerts.push('Warning: Sentiment declining for 7 consecutive days');
  if (data.length >= 2 && data[data.length - 1].score < data[data.length - 2].score * 0.8) {
    alerts.push('Alert: Sharp single-day sentiment drop detected');
  }

  return {
    overallScore: Math.round(avgRecent),
    totalAnalyzed,
    positivePct: Math.round((totalPositive / totalAnalyzed) * 100),
    neutralPct: Math.round((totalNeutral / totalAnalyzed) * 100),
    negativePct: Math.round((totalNegative / totalAnalyzed) * 100),
    trend,
    alerts,
  };
}

export function getLocationSentiment(): LocationSentiment[] {
  return [
    { location: 'New York',     score: 72, count: 1250 },
    { location: 'San Francisco', score: 68, count: 980 },
    { location: 'London',       score: 65, count: 720 },
    { location: 'Tokyo',        score: 78, count: 540 },
    { location: 'Berlin',       score: 71, count: 410 },
    { location: 'Singapore',    score: 74, count: 380 },
    { location: 'Lagos',        score: 62, count: 320 },
    { location: 'Buenos Aires', score: 69, count: 290 },
  ];
}

export function getCategorySentiment(): CategorySentiment[] {
  return [
    { category: 'Events',   score: 74, sampleSize: 420 },
    { category: 'Food',     score: 68, sampleSize: 380 },
    { category: 'Safety',   score: 42, sampleSize: 210 },
    { category: 'Tips',     score: 71, sampleSize: 560 },
    { category: 'News',     score: 55, sampleSize: 340 },
    { category: 'Transit',  score: 63, sampleSize: 290 },
    { category: 'Markets',  score: 67, sampleSize: 180 },
    { category: 'Other',    score: 60, sampleSize: 450 },
  ];
}

export function correlateEventsWithSentiment() {
  return [
    { event: 'Platform v2.0 Launch',    date: 'Jun 10', beforeScore: 62, afterScore: 78, impact: 'positive' },
    { event: 'Network Outage',          date: 'Jun 14', beforeScore: 75, afterScore: 45, impact: 'negative' },
    { event: 'Mobile App Release',      date: 'Jun 18', beforeScore: 58, afterScore: 71, impact: 'positive' },
    { event: 'Fee Structure Change',    date: 'Jun 22', beforeScore: 70, afterScore: 55, impact: 'negative' },
    { event: 'Community AMA',           date: 'Jun 26', beforeScore: 64, afterScore: 73, impact: 'positive' },
  ];
}
