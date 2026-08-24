// Content authenticity scoring model.
//
// Scores each gist 0–100 for how likely it is to be authentic human content
// vs. spam/low-effort/bot-generated material. The model is a weighted blend of
// independent signal scores (0–100 each); higher = more authentic.

export interface AuthenticitySignals {
  /** Ratio of unique words to total words (boilerplate/copy-paste scores low) */
  lexicalOriginality: number;
  /** Density of suspicious outbound links vs content length */
  linkSpamRatio: number;
  /** Engagement velocity that looks organic (no sudden bot-like spikes) */
  engagementAuthenticity: number;
  /** Author account age + prior authentic history */
  authorReputation: number;
  /** Formatting quality: paragraphs, sentence variance, no ALL-CAPS floods */
  formattingQuality: number;
}

export interface GistContent {
  id: string;
  title: string;
  author: string;
  signals: AuthenticitySignals;
  views: number;
  flags: number; // user reports received
  publishedDaysAgo: number;
  scoreHistory: { day: number; score: number }[];
}

export interface ScoredGist {
  id: string;
  title: string;
  author: string;
  score: number;
  breakdown: Record<keyof AuthenticitySignals, number>;
  isSuspicious: boolean;
}

/** Weights sum to 1 — tune here only */
const SIGNAL_WEIGHTS: Record<keyof AuthenticitySignals, number> = {
  lexicalOriginality: 0.25,
  linkSpamRatio: 0.2,
  engagementAuthenticity: 0.2,
  authorReputation: 0.2,
  formattingQuality: 0.15,
};

/** Below this threshold content is flagged as potentially inauthentic */
export const SUSPICIOUS_THRESHOLD = 45;

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Weighted-blend authenticity score for a single gist.
 * User reports subtract a small penalty on top of the signal blend.
 */
export function scoreGist(g: GistContent): ScoredGist {
  const breakdown = {
    lexicalOriginality: g.signals.lexicalOriginality,
    linkSpamRatio: g.signals.linkSpamRatio,
    engagementAuthenticity: g.signals.engagementAuthenticity,
    authorReputation: g.signals.authorReputation,
    formattingQuality: g.signals.formattingQuality,
  } as Record<keyof AuthenticitySignals, number>;

  let score = (Object.keys(SIGNAL_WEIGHTS) as (keyof AuthenticitySignals)[])
    .reduce((sum, key) => sum + breakdown[key] * SIGNAL_WEIGHTS[key], 0);

  // Each user report erodes trust slightly (max -15)
  score -= Math.min(15, g.flags * 3);

  const finalScore = clamp01(score);
  return {
    id: g.id,
    title: g.title,
    author: g.author,
    score: finalScore,
    breakdown,
    isSuspicious: finalScore < SUSPICIOUS_THRESHOLD,
  };
}

export function scoreAll(gists: GistContent[]): ScoredGist[] {
  return gists.map(scoreGist).sort((a, b) => b.score - a.score);
}

/** Distribution of scores across fixed buckets for the histogram */
export function getAuthenticityDistribution(
  scored: ScoredGist[],
): { range: string; count: number }[] {
  const buckets: { range: string; test: (s: number) => boolean }[] = [
    { range: '90-100', test: (s) => s >= 90 },
    { range: '80-89', test: (s) => s >= 80 && s < 90 },
    { range: '70-79', test: (s) => s >= 70 && s < 80 },
    { range: '60-69', test: (s) => s >= 60 && s < 70 },
    { range: '50-59', test: (s) => s >= 50 && s < 60 },
    { range: '<50', test: (s) => s < 50 },
  ];
  return buckets.map((b) => ({
    range: b.range,
    count: scored.filter((s) => b.test(s.score)).length,
  }));
}

/** Platform-wide average authenticity trend over recent weeks */
export function getAuthenticityTrend(
  gists: GistContent[],
): { week: string; avgScore: number }[] {
  const weeks = ['6w ago', '5w ago', '4w ago', '3w ago', '2w ago', 'last week'];
  return weeks.map((week, i) => {
    const values = gists
      .map((g) => g.scoreHistory.find((h) => h.day === i)?.score)
      .filter((v): v is number => v !== undefined);
    const avg =
      values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
    return { week, avgScore: avg };
  });
}

export function getAuthenticityColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

/** CSV export of flagged (suspicious) content for moderation review */
export function exportSuspiciousCSV(scored: ScoredGist[]): void {
  const flagged = scored.filter((s) => s.isSuspicious);
  const header = 'ID,Title,Author,Score,LexicalOriginality,LinkSpam,Engagement,AuthorRep,Formatting';
  const rows = flagged.map((s) =>
    [
      `"${s.id}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.author}"`,
      s.score,
      s.breakdown.lexicalOriginality,
      s.breakdown.linkSpamRatio,
      s.breakdown.engagementAuthenticity,
      s.breakdown.authorReputation,
      s.breakdown.formattingQuality,
    ].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flagged-content.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Mock corpus — replace with real ingestion when the pipeline lands
// ---------------------------------------------------------------------------

export const MOCK_GISTS: GistContent[] = [
  { id: 'g-001', title: 'Building a Soroban escrow contract from scratch', author: 'devmaria', views: 12400, flags: 0, publishedDaysAgo: 42,
    signals: { lexicalOriginality: 94, linkSpamRatio: 92, engagementAuthenticity: 90, authorReputation: 96, formattingQuality: 93 },
    scoreHistory: [{ day: 0, score: 78 }, { day: 1, score: 81 }, { day: 2, score: 84 }, { day: 3, score: 86 }, { day: 4, score: 89 }, { day: 5, score: 92 }] },
  { id: 'g-002', title: 'Why I moved my freelance invoicing on-chain', author: 'kwamenft', views: 8210, flags: 0, publishedDaysAgo: 30,
    signals: { lexicalOriginality: 88, linkSpamRatio: 85, engagementAuthenticity: 84, authorReputation: 82, formattingQuality: 86 },
    scoreHistory: [{ day: 0, score: 72 }, { day: 1, score: 74 }, { day: 2, score: 76 }, { day: 3, score: 79 }, { day: 4, score: 83 }, { day: 5, score: 85 }] },
  { id: 'g-003', title: 'Weekly digest #12: Stellar dev tooling roundup', author: 'gistbot', views: 3010, flags: 2, publishedDaysAgo: 20,
    signals: { lexicalOriginality: 52, linkSpamRatio: 58, engagementAuthenticity: 66, authorReputation: 61, formattingQuality: 70 },
    scoreHistory: [{ day: 0, score: 48 }, { day: 1, score: 52 }, { day: 2, score: 55 }, { day: 3, score: 57 }, { day: 4, score: 60 }, { day: 5, score: 62 }] },
  { id: 'g-004', title: 'CLAIM YOUR FREE XLM AIRDROP NOW!!!', author: 'airdrop_king', views: 15600, flags: 41, publishedDaysAgo: 3,
    signals: { lexicalOriginality: 8, linkSpamRatio: 5, engagementAuthenticity: 12, authorReputation: 6, formattingQuality: 10 },
    scoreHistory: [{ day: 0, score: 14 }, { day: 1, score: 11 }, { day: 2, score: 9 }, { day: 3, score: 7 }, { day: 4, score: 6 }, { day: 5, score: 5 }] },
  { id: 'g-005', title: 'Debugging ledger sequence numbers: a field guide', author: 'sorianova', views: 6740, flags: 0, publishedDaysAgo: 55,
    signals: { lexicalOriginality: 91, linkSpamRatio: 88, engagementAuthenticity: 87, authorReputation: 90, formattingQuality: 88 },
    scoreHistory: [{ day: 0, score: 80 }, { day: 1, score: 82 }, { day: 2, score: 85 }, { day: 3, score: 87 }, { day: 4, score: 88 }, { day: 5, score: 89 }] },
  { id: 'g-006', title: 'buy followers cheap best prices dm me', author: 'promo_zar', views: 4200, flags: 28, publishedDaysAgo: 6,
    signals: { lexicalOriginality: 12, linkSpamRatio: 18, engagementAuthenticity: 22, authorReputation: 15, formattingQuality: 14 },
    scoreHistory: [{ day: 0, score: 22 }, { day: 1, score: 19 }, { day: 2, score: 17 }, { day: 3, score: 16 }, { day: 4, score: 14 }, { day: 5, score: 13 }] },
  { id: 'g-007', title: 'Notes from hacking at the Africa hackathon finals', author: 'temi.dev', views: 5120, flags: 0, publishedDaysAgo: 12,
    signals: { lexicalOriginality: 86, linkSpamRatio: 90, engagementAuthenticity: 88, authorReputation: 79, formattingQuality: 84 },
    scoreHistory: [{ day: 0, score: 70 }, { day: 1, score: 74 }, { day: 2, score: 77 }, { day: 3, score: 80 }, { day: 4, score: 83 }, { day: 5, score: 86 }] },
  { id: 'g-008', title: 'Top 10 crypto gains you WON\u2019T believe (#7 shocking)', author: 'clickmaster', views: 9870, flags: 33, publishedDaysAgo: 8,
    signals: { lexicalOriginality: 24, linkSpamRatio: 30, engagementAuthenticity: 35, authorReputation: 20, formattingQuality: 26 },
    scoreHistory: [{ day: 0, score: 35 }, { day: 1, score: 32 }, { day: 2, score: 29 }, { day: 3, score: 27 }, { day: 4, score: 25 }, { day: 5, score: 23 }] },
];
