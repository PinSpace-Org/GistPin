export interface ContentItem {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  avgReadSeconds: number;
}

export interface ScoredContent extends ContentItem {
  score: number;
  breakdown: Record<string, number>;
}

/** Weights must sum to 1 */
const WEIGHTS = {
  views:           0.10,
  likes:           0.25,
  comments:        0.25,
  shares:          0.20,
  bookmarks:       0.10,
  avgReadSeconds:  0.10,
} as const;

/** Normalise a value to [0, 100] given the max in the dataset */
function norm(value: number, max: number): number {
  return max === 0 ? 0 : (value / max) * 100;
}

export function calcEngagementScores(items: ContentItem[]): ScoredContent[] {
  if (items.length === 0) return [];

  const maxes = {
    views:          Math.max(...items.map((i) => i.views)),
    likes:          Math.max(...items.map((i) => i.likes)),
    comments:       Math.max(...items.map((i) => i.comments)),
    shares:         Math.max(...items.map((i) => i.shares)),
    bookmarks:      Math.max(...items.map((i) => i.bookmarks)),
    avgReadSeconds: Math.max(...items.map((i) => i.avgReadSeconds)),
  };

  return items
    .map((item) => {
      const breakdown = {
        views:          parseFloat((norm(item.views,          maxes.views)          * WEIGHTS.views).toFixed(2)),
        likes:          parseFloat((norm(item.likes,          maxes.likes)          * WEIGHTS.likes).toFixed(2)),
        comments:       parseFloat((norm(item.comments,       maxes.comments)       * WEIGHTS.comments).toFixed(2)),
        shares:         parseFloat((norm(item.shares,         maxes.shares)         * WEIGHTS.shares).toFixed(2)),
        bookmarks:      parseFloat((norm(item.bookmarks,      maxes.bookmarks)      * WEIGHTS.bookmarks).toFixed(2)),
        avgReadSeconds: parseFloat((norm(item.avgReadSeconds, maxes.avgReadSeconds) * WEIGHTS.avgReadSeconds).toFixed(2)),
      };
      const score = parseFloat(Object.values(breakdown).reduce((a, b) => a + b, 0).toFixed(2));
      return { ...item, score, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}

export const MOCK_CONTENT: ContentItem[] = [
  { id: '1', title: 'Hidden Gems in Downtown',   views: 4200, likes: 380, comments: 92, shares: 145, bookmarks: 210, avgReadSeconds: 180 },
  { id: '2', title: 'Best Street Food Spots',    views: 6800, likes: 620, comments: 134, shares: 290, bookmarks: 340, avgReadSeconds: 240 },
  { id: '3', title: 'Weekend Hiking Trails',     views: 3100, likes: 270, comments: 58, shares: 88,  bookmarks: 155, avgReadSeconds: 210 },
  { id: '4', title: 'Local Art Exhibitions',     views: 1900, likes: 190, comments: 44, shares: 62,  bookmarks: 98,  avgReadSeconds: 150 },
  { id: '5', title: 'Night Market Guide',        views: 5500, likes: 510, comments: 110, shares: 220, bookmarks: 280, avgReadSeconds: 195 },
  { id: '6', title: 'Coffee Shop Reviews',       views: 7200, likes: 680, comments: 155, shares: 310, bookmarks: 390, avgReadSeconds: 260 },
  { id: '7', title: 'Community Events This Week',views: 2800, likes: 230, comments: 67, shares: 95,  bookmarks: 120, avgReadSeconds: 130 },
  { id: '8', title: 'Parking Tips & Tricks',     views: 1400, likes: 110, comments: 28, shares: 40,  bookmarks: 65,  avgReadSeconds: 90  },
];
