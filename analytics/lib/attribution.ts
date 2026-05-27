export type AttributionModel = 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'position-based';

export interface TouchPoint {
  channel: string;
  timestamp: number; // ms since epoch
  revenue: number;
}

export interface AttributionResult {
  channel: string;
  credit: number; // 0–1 fraction of total revenue
  revenue: number;
}

/** Distribute revenue across touch points using the selected model. */
export function attribute(
  touches: TouchPoint[],
  model: AttributionModel,
): AttributionResult[] {
  if (touches.length === 0) return [];

  const weights = computeWeights(touches, model);
  const totalRevenue = touches.reduce((s, t) => s + t.revenue, 0);

  // Aggregate by channel
  const map = new Map<string, number>();
  touches.forEach((t, i) => {
    map.set(t.channel, (map.get(t.channel) ?? 0) + weights[i]);
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return Array.from(map.entries()).map(([channel, w]) => ({
    channel,
    credit: totalWeight > 0 ? w / totalWeight : 0,
    revenue: totalWeight > 0 ? (w / totalWeight) * totalRevenue : 0,
  }));
}

function computeWeights(touches: TouchPoint[], model: AttributionModel): number[] {
  const n = touches.length;

  switch (model) {
    case 'first-touch':
      return touches.map((_, i) => (i === 0 ? 1 : 0));

    case 'last-touch':
      return touches.map((_, i) => (i === n - 1 ? 1 : 0));

    case 'linear':
      return touches.map(() => 1 / n);

    case 'time-decay': {
      // Exponential decay: more recent touches get higher weight (half-life = 7 days)
      const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
      const latest = touches[n - 1].timestamp;
      const raw = touches.map((t) => Math.pow(2, (t.timestamp - latest) / halfLifeMs));
      const sum = raw.reduce((s, w) => s + w, 0);
      return raw.map((w) => w / sum);
    }

    case 'position-based': {
      // 40% first, 40% last, 20% split among middle
      if (n === 1) return [1];
      if (n === 2) return [0.5, 0.5];
      const middleShare = 0.2 / (n - 2);
      return touches.map((_, i) => {
        if (i === 0) return 0.4;
        if (i === n - 1) return 0.4;
        return middleShare;
      });
    }
  }
}

/** Summarise revenue by channel across all touch points (raw, no model). */
export function revenueByChannel(touches: TouchPoint[]): Record<string, number> {
  return touches.reduce<Record<string, number>>((acc, t) => {
    acc[t.channel] = (acc[t.channel] ?? 0) + t.revenue;
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Mock data for the UI
// ---------------------------------------------------------------------------
export const MOCK_TOUCHES: TouchPoint[] = [
  { channel: 'Organic Search', timestamp: Date.now() - 12 * 86400_000, revenue: 420 },
  { channel: 'Paid Social',    timestamp: Date.now() - 9  * 86400_000, revenue: 310 },
  { channel: 'Email',          timestamp: Date.now() - 6  * 86400_000, revenue: 280 },
  { channel: 'Referral',       timestamp: Date.now() - 3  * 86400_000, revenue: 190 },
  { channel: 'Direct',         timestamp: Date.now() - 1  * 86400_000, revenue: 350 },
];

export const MODELS: { value: AttributionModel; label: string; description: string }[] = [
  { value: 'first-touch',     label: 'First Touch',     description: '100% credit to the first channel.' },
  { value: 'last-touch',      label: 'Last Touch',      description: '100% credit to the last channel.' },
  { value: 'linear',          label: 'Linear',          description: 'Equal credit across all touch points.' },
  { value: 'time-decay',      label: 'Time Decay',      description: 'More credit to recent touch points (7-day half-life).' },
  { value: 'position-based',  label: 'Position Based',  description: '40% first, 40% last, 20% split among middle.' },
];
