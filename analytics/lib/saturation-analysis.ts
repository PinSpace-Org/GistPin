/**
 * Geographic Content Saturation Analysis Engine (Issue #1187)
 * Analyzes content density vs demand ratios, computes spatial cell saturation scores,
 * detects opportunity zones, and tracks geographic saturation trajectories.
 */

export type SaturationTier = 'starved' | 'under_served' | 'balanced' | 'over_saturated';

export interface SpatialCell {
  id: string;
  name: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contentCount: number; // Available gists
  searchDemandCount: number; // Search queries / pin requests
  activeUsers: number;
  contentDensityPerSqKm: number;
  demandRatio: number; // Content / Demand normalized
  saturationScore: number; // 0 - 100
  tier: SaturationTier;
  opportunityIndex: number; // 0 - 100 (high demand, low supply = high opportunity)
  topTrendingCategory: string;
  avgEngagementPerGist: number;
  creatorIncentiveMultiplier: number; // e.g. 1.0x to 3.5x for starved zones
}

export interface RegionSaturationSummary {
  region: string;
  totalGists: number;
  totalDemand: number;
  avgSaturationScore: number;
  tierBreakdown: Record<SaturationTier, number>; // counts of cells in each tier
  opportunityZonesCount: number;
  saturationTrend: number[]; // 6-month historical trajectory
}

export interface OpportunityZone {
  cellId: string;
  cellName: string;
  region: string;
  coordinates: { lat: number; lng: number };
  demandCount: number;
  supplyCount: number;
  deficitCount: number;
  opportunityScore: number; // 0 - 100
  recommendedAction: string;
  estimatedCreatorYieldXlm: number;
  creatorMultiplier: number;
}

// ── Saturation Scoring Functions ──────────────────────────────────────────────

/**
 * Classifies saturation score / ratio into tiered categories
 */
export function classifySaturationTier(demandRatio: number): SaturationTier {
  if (demandRatio < 0.35) return 'starved';
  if (demandRatio < 0.8) return 'under_served';
  if (demandRatio <= 1.6) return 'balanced';
  return 'over_saturated';
}

/**
 * Calculates saturation score (0 - 100) from content and demand
 */
export function calculateSaturationScore(content: number, demand: number): number {
  if (demand <= 0) return content > 0 ? 100 : 50;
  const ratio = content / demand;
  // Map ratio 0.0 -> 10, 1.0 -> 50, 2.0+ -> 100
  const score = Math.min(100, Math.max(0, Math.round(ratio * 50)));
  return score;
}

/**
 * Calculates Opportunity Index (0 - 100) for a spatial cell
 */
export function calculateOpportunityIndex(content: number, demand: number): number {
  if (demand <= 0) return 0;
  const deficit = Math.max(0, demand - content * 1.2);
  const ratio = deficit / (demand + 10);
  return Math.min(100, Math.round(ratio * 100));
}

// ── Mock Geographic Datasets ──────────────────────────────────────────────────

export function getSpatialCells(): SpatialCell[] {
  return [
    {
      id: 'cell-lagos-island',
      name: 'Lagos Island & Victoria Island',
      region: 'West Africa',
      coordinates: { lat: 6.4549, lng: 3.4246 },
      contentCount: 4250,
      searchDemandCount: 5100,
      activeUsers: 8900,
      contentDensityPerSqKm: 142.5,
      demandRatio: 0.83,
      saturationScore: 48,
      tier: 'balanced',
      opportunityIndex: 52,
      topTrendingCategory: 'Fintech & Nightlife',
      avgEngagementPerGist: 28.4,
      creatorIncentiveMultiplier: 1.2,
    },
    {
      id: 'cell-lagos-ikeja',
      name: 'Ikeja & Maryland Business Hub',
      region: 'West Africa',
      coordinates: { lat: 6.5964, lng: 3.3424 },
      contentCount: 3820,
      searchDemandCount: 4400,
      activeUsers: 7200,
      contentDensityPerSqKm: 118.2,
      demandRatio: 0.86,
      saturationScore: 51,
      tier: 'balanced',
      opportunityIndex: 45,
      topTrendingCategory: 'Tech & Markets',
      avgEngagementPerGist: 24.1,
      creatorIncentiveMultiplier: 1.1,
    },
    {
      id: 'cell-abuja-cbd',
      name: 'Abuja Central Business District',
      region: 'West Africa',
      coordinates: { lat: 9.0579, lng: 7.4951 },
      contentCount: 1420,
      searchDemandCount: 4800,
      activeUsers: 6100,
      contentDensityPerSqKm: 42.1,
      demandRatio: 0.29,
      saturationScore: 22,
      tier: 'starved',
      opportunityIndex: 94,
      topTrendingCategory: 'Civic & Real Estate',
      avgEngagementPerGist: 45.2,
      creatorIncentiveMultiplier: 3.2,
    },
    {
      id: 'cell-nairobi-westlands',
      name: 'Nairobi Westlands & Kilimani',
      region: 'East Africa',
      coordinates: { lat: -1.2683, lng: 36.8044 },
      contentCount: 2890,
      searchDemandCount: 3400,
      activeUsers: 5800,
      contentDensityPerSqKm: 88.4,
      demandRatio: 0.85,
      saturationScore: 49,
      tier: 'balanced',
      opportunityIndex: 48,
      topTrendingCategory: 'Cafes & Co-working',
      avgEngagementPerGist: 22.8,
      creatorIncentiveMultiplier: 1.2,
    },
    {
      id: 'cell-mombasa-island',
      name: 'Mombasa Old Town & Coast',
      region: 'East Africa',
      coordinates: { lat: -4.0435, lng: 39.6682 },
      contentCount: 480,
      searchDemandCount: 2900,
      activeUsers: 3400,
      contentDensityPerSqKm: 18.5,
      demandRatio: 0.16,
      saturationScore: 14,
      tier: 'starved',
      opportunityIndex: 98,
      topTrendingCategory: 'Tourism & Maritime',
      avgEngagementPerGist: 52.0,
      creatorIncentiveMultiplier: 3.5,
    },
    {
      id: 'cell-cairo-downtown',
      name: 'Cairo Downtown & Zamalek',
      region: 'North Africa',
      coordinates: { lat: 30.0444, lng: 31.2357 },
      contentCount: 1840,
      searchDemandCount: 4100,
      activeUsers: 6700,
      contentDensityPerSqKm: 56.2,
      demandRatio: 0.44,
      saturationScore: 32,
      tier: 'under_served',
      opportunityIndex: 82,
      topTrendingCategory: 'Culture & Food',
      avgEngagementPerGist: 38.6,
      creatorIncentiveMultiplier: 2.2,
    },
    {
      id: 'cell-london-shoreditch',
      name: 'London Shoreditch & City',
      region: 'Europe',
      coordinates: { lat: 51.5229, lng: -0.0777 },
      contentCount: 12400,
      searchDemandCount: 6800,
      activeUsers: 14500,
      contentDensityPerSqKm: 380.0,
      demandRatio: 1.82,
      saturationScore: 92,
      tier: 'over_saturated',
      opportunityIndex: 12,
      topTrendingCategory: 'Web3 & Nightlife',
      avgEngagementPerGist: 11.2,
      creatorIncentiveMultiplier: 0.8,
    },
    {
      id: 'cell-berlin-mitte',
      name: 'Berlin Mitte & Kreuzberg',
      region: 'Europe',
      coordinates: { lat: 52.52, lng: 13.405 },
      contentCount: 8900,
      searchDemandCount: 5200,
      activeUsers: 9800,
      contentDensityPerSqKm: 295.0,
      demandRatio: 1.71,
      saturationScore: 88,
      tier: 'over_saturated',
      opportunityIndex: 15,
      topTrendingCategory: 'Art & Startups',
      avgEngagementPerGist: 13.4,
      creatorIncentiveMultiplier: 0.85,
    },
    {
      id: 'cell-ny-manhattan',
      name: 'New York Lower Manhattan',
      region: 'North America',
      coordinates: { lat: 40.7128, lng: -74.006 },
      contentCount: 16500,
      searchDemandCount: 9200,
      activeUsers: 21000,
      contentDensityPerSqKm: 460.0,
      demandRatio: 1.79,
      saturationScore: 94,
      tier: 'over_saturated',
      opportunityIndex: 10,
      topTrendingCategory: 'Finance & Events',
      avgEngagementPerGist: 9.8,
      creatorIncentiveMultiplier: 0.75,
    },
    {
      id: 'cell-austin-downtown',
      name: 'Austin Downtown & East Austin',
      region: 'North America',
      coordinates: { lat: 30.2672, lng: -97.7431 },
      contentCount: 3100,
      searchDemandCount: 5600,
      activeUsers: 7800,
      contentDensityPerSqKm: 82.5,
      demandRatio: 0.55,
      saturationScore: 38,
      tier: 'under_served',
      opportunityIndex: 76,
      topTrendingCategory: 'Music & Crypto',
      avgEngagementPerGist: 34.2,
      creatorIncentiveMultiplier: 1.8,
    },
    {
      id: 'cell-sao-paulo-paulista',
      name: 'São Paulo Avenida Paulista',
      region: 'South America',
      coordinates: { lat: -23.5615, lng: -46.656 },
      contentCount: 2200,
      searchDemandCount: 6100,
      activeUsers: 8400,
      contentDensityPerSqKm: 64.0,
      demandRatio: 0.36,
      saturationScore: 28,
      tier: 'under_served',
      opportunityIndex: 88,
      topTrendingCategory: 'Street Art & Gastronomy',
      avgEngagementPerGist: 41.5,
      creatorIncentiveMultiplier: 2.5,
    },
    {
      id: 'cell-singapore-marina',
      name: 'Singapore Marina Bay & CBD',
      region: 'Asia Pacific',
      coordinates: { lat: 1.2838, lng: 103.8591 },
      contentCount: 4100,
      searchDemandCount: 4600,
      activeUsers: 6900,
      contentDensityPerSqKm: 130.0,
      demandRatio: 0.89,
      saturationScore: 54,
      tier: 'balanced',
      opportunityIndex: 42,
      topTrendingCategory: 'Web3 Hub & Retail',
      avgEngagementPerGist: 21.0,
      creatorIncentiveMultiplier: 1.0,
    },
  ];
}

export function getRegionalSummaries(): RegionSaturationSummary[] {
  return [
    {
      region: 'West Africa',
      totalGists: 9490,
      totalDemand: 14300,
      avgSaturationScore: 40.3,
      tierBreakdown: { starved: 1, under_served: 0, balanced: 2, over_saturated: 0 },
      opportunityZonesCount: 4,
      saturationTrend: [24, 28, 33, 36, 39, 40],
    },
    {
      region: 'East Africa',
      totalGists: 3370,
      totalDemand: 6300,
      avgSaturationScore: 31.5,
      tierBreakdown: { starved: 1, under_served: 0, balanced: 1, over_saturated: 0 },
      opportunityZonesCount: 3,
      saturationTrend: [18, 22, 25, 27, 30, 31],
    },
    {
      region: 'North America',
      totalGists: 19600,
      totalDemand: 14800,
      avgSaturationScore: 66.0,
      tierBreakdown: { starved: 0, under_served: 1, balanced: 0, over_saturated: 1 },
      opportunityZonesCount: 1,
      saturationTrend: [58, 60, 62, 64, 65, 66],
    },
    {
      region: 'Europe',
      totalGists: 21300,
      totalDemand: 12000,
      avgSaturationScore: 90.0,
      tierBreakdown: { starved: 0, under_served: 0, balanced: 0, over_saturated: 2 },
      opportunityZonesCount: 0,
      saturationTrend: [82, 85, 87, 88, 89, 90],
    },
    {
      region: 'South America',
      totalGists: 2200,
      totalDemand: 6100,
      avgSaturationScore: 28.0,
      tierBreakdown: { starved: 0, under_served: 1, balanced: 0, over_saturated: 0 },
      opportunityZonesCount: 2,
      saturationTrend: [14, 18, 21, 24, 26, 28],
    },
  ];
}

export function detectOpportunityZones(cells: SpatialCell[]): OpportunityZone[] {
  return cells
    .filter((c) => c.tier === 'starved' || c.tier === 'under_served')
    .sort((a, b) => b.opportunityIndex - a.opportunityIndex)
    .map((c) => ({
      cellId: c.id,
      cellName: c.name,
      region: c.region,
      coordinates: c.coordinates,
      demandCount: c.searchDemandCount,
      supplyCount: c.contentCount,
      deficitCount: Math.max(0, c.searchDemandCount - c.contentCount),
      opportunityScore: c.opportunityIndex,
      recommendedAction:
        c.tier === 'starved'
          ? `Deploy Creator Reward Boost (${c.creatorIncentiveMultiplier}x XLM bounty) for ${c.topTrendingCategory}`
          : `Seed local ambassador campaigns and partner with regional communities`,
      estimatedCreatorYieldXlm: Math.round(c.opportunityIndex * 14.5),
      creatorMultiplier: c.creatorIncentiveMultiplier,
    }));
}
