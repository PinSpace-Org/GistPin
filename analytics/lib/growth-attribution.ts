export type AttributionModel = 'first-touch' | 'last-touch' | 'linear' | 'time-decay';

export interface AttributionSource {
  id: string;
  name: string;
  type: 'campaign' | 'organic' | 'referral' | 'social' | 'paid';
  touches: number;
  converted: number;
  revenue: number;
}

export interface AttributionResult {
  model: AttributionModel;
  sources: AttributionSource[];
  totalConversions: number;
  totalRevenue: number;
  organicPct: number;
  paidPct: number;
}

export interface GrowthPoint {
  date: string;
  organic: number;
  paid: number;
  referral: number;
  total: number;
}

export function getAttributionSources(): AttributionSource[] {
  return [
    { id: 's1', name: 'GrantFox Campaign',      type: 'campaign', touches: 420, converted: 68,  revenue: 15200 },
    { id: 's2', name: 'Twitter / X',             type: 'social',   touches: 310, converted: 42,  revenue: 8400  },
    { id: 's3', name: 'Direct / Organic Search', type: 'organic',  touches: 580, converted: 95,  revenue: 21800 },
    { id: 's4', name: 'Dev.to Article',           type: 'organic',  touches: 180, converted: 28,  revenue: 5600  },
    { id: 's5', name: 'Stellar Discord',          type: 'referral', touches: 140, converted: 22,  revenue: 4400  },
    { id: 's6', name: 'GitHub Sponsors',          type: 'referral', touches: 95,  converted: 15,  revenue: 3200  },
    { id: 's7', name: 'Google Ads',               type: 'paid',     touches: 260, converted: 31,  revenue: 6200  },
    { id: 's8', name: 'Crypto Newsletter',         type: 'paid',     touches: 120, converted: 18,  revenue: 3600  },
  ];
}

export function computeAttribution(sources: AttributionSource[], model: AttributionModel): AttributionResult {
  const weights = sources.map((_, i) => {
    switch (model) {
      case 'first-touch': return i === 0 ? 1 : 0;
      case 'last-touch':  return i === sources.length - 1 ? 1 : 0;
      case 'linear':      return 1 / sources.length;
      case 'time-decay':  return Math.pow(0.5, i) / (1 - Math.pow(0.5, sources.length)) * (1 - 0.5);
      default:            return 1 / sources.length;
    }
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const normalized = weights.map((w) => w / totalWeight);

  const attributed = sources.map((source, i) => ({
    ...source,
    attributedConversions: Math.round(source.converted * normalized[i] * 100) / 100,
    attributedRevenue: Math.round(source.revenue * normalized[i] * 100) / 100,
  }));

  const totalConversions = sources.reduce((s, src) => s + src.converted, 0);
  const totalRevenue = sources.reduce((s, src) => s + src.revenue, 0);
  const organicConversions = sources.filter((s) => s.type === 'organic' || s.type === 'referral').reduce((sum, s) => sum + s.converted, 0);
  const paidConversions = sources.filter((s) => s.type === 'paid' || s.type === 'campaign').reduce((sum, s) => sum + s.converted, 0);

  return {
    model,
    sources: attributed,
    totalConversions,
    totalRevenue,
    organicPct: Math.round((organicConversions / totalConversions) * 100),
    paidPct: Math.round((paidConversions / totalConversions) * 100),
  };
}

export function getGrowthData(): GrowthPoint[] {
  return [
    { date: 'May 1',  organic: 24, paid: 8,  referral: 12, total: 44 },
    { date: 'May 8',  organic: 28, paid: 10, referral: 14, total: 52 },
    { date: 'May 15', organic: 32, paid: 12, referral: 16, total: 60 },
    { date: 'May 22', organic: 30, paid: 14, referral: 18, total: 62 },
    { date: 'Jun 1',  organic: 38, paid: 16, referral: 20, total: 74 },
    { date: 'Jun 8',  organic: 42, paid: 18, referral: 22, total: 82 },
    { date: 'Jun 15', organic: 45, paid: 20, referral: 24, total: 89 },
    { date: 'Jun 22', organic: 48, paid: 18, referral: 28, total: 94 },
  ];
}

export function getCampaignEffectiveness() {
  return [
    { campaign: 'Spring Launch',     contributors: 18, prsMerged: 42, issuesClosed: 56, conversionRate: 14.2 },
    { campaign: 'Hackathon Q2',      contributors: 32, prsMerged: 78, issuesClosed: 94, conversionRate: 22.8 },
    { campaign: 'Docs Improvement',  contributors: 12, prsMerged: 28, issuesClosed: 35, conversionRate: 18.5 },
    { campaign: 'Bug Bash',          contributors: 24, prsMerged: 52, issuesClosed: 71, conversionRate: 26.1 },
  ];
}
