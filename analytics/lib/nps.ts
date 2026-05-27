// NPS score utilities

export type NPSCategory = 'Promoter' | 'Passive' | 'Detractor';

export interface NPSResponse {
  score: number;   // 0–10
  segment?: string;
  date: string;
}

export interface NPSBreakdown {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

/** Classify a single score into NPS category */
export function classifyScore(score: number): NPSCategory {
  if (score >= 9) return 'Promoter';
  if (score >= 7) return 'Passive';
  return 'Detractor';
}

/** Calculate NPS and breakdown from a list of responses */
export function calcNPS(responses: NPSResponse[]): NPSBreakdown {
  const total = responses.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0, nps: 0 };

  const promoters  = responses.filter((r) => r.score >= 9).length;
  const passives   = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);

  return { promoters, passives, detractors, total, nps };
}

/** Group responses by month (YYYY-MM) and return NPS per period */
export function npsOverTime(responses: NPSResponse[]): { period: string; nps: number }[] {
  const byPeriod: Record<string, NPSResponse[]> = {};
  for (const r of responses) {
    const period = r.date.slice(0, 7);
    (byPeriod[period] ??= []).push(r);
  }
  return Object.entries(byPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rs]) => ({ period, nps: calcNPS(rs).nps }));
}

/** Group responses by segment and return NPS per segment */
export function npsBySegment(responses: NPSResponse[]): { segment: string; nps: number }[] {
  const bySegment: Record<string, NPSResponse[]> = {};
  for (const r of responses) {
    const seg = r.segment ?? 'Unknown';
    (bySegment[seg] ??= []).push(r);
  }
  return Object.entries(bySegment).map(([segment, rs]) => ({ segment, nps: calcNPS(rs).nps }));
}
